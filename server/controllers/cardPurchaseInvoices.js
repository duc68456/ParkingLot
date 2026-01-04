const cardPurchaseInvoicesRouter = require('express').Router()
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const CardPurchaseDetail = require('../models/cardPurchaseDetail')
const Customer = require('../models/customer')
const Employee = require('../models/employee')
const Card = require('../models/card')

// GET all invoices with filtering and pagination
cardPurchaseInvoicesRouter.get('/', async (req, res) => {
  try {
    const {
      customerId,
      saledBy,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (customerId) {
      filter.CustomerID = customerId
    }

    if (saledBy) {
      filter.SaledBy = saledBy
    }

    if (status) {
      filter.Status = status.toUpperCase()
    }

    // Filter by date range
    if (fromDate || toDate) {
      filter.InvoiceDate = {}
      if (fromDate) {
        filter.InvoiceDate.$gte = new Date(fromDate)
      }
      if (toDate) {
        filter.InvoiceDate.$lte = new Date(toDate)
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await CardPurchaseInvoice.countDocuments(filter)

    const invoices = await CardPurchaseInvoice
      .find(filter)
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate({
        path: 'SaledBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ InvoiceDate: -1 })

    res.json({
      success: true,
      data: {
        items: invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_INVOICES_ERROR'
      }
    })
  }
})

// GET single invoice by ID with details
cardPurchaseInvoicesRouter.get('/:id', async (req, res) => {
  try {
    const invoice = await CardPurchaseInvoice
      .findById(req.params.id)
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone Gender'
        }
      })
      .populate({
        path: 'SaledBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        }
      })
    }

    // Get invoice details
    const details = await CardPurchaseDetail
      .find({ InvoiceID: invoice.ID })
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    res.json({
      success: true,
      data: {
        ...invoice.toJSON(),
        details
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_INVOICE_ERROR'
      }
    })
  }
})

// POST - Create new invoice with details
cardPurchaseInvoicesRouter.post('/', async (req, res) => {
  try {
    const {
      CustomerID,
      SaledBy,
      InvoiceDate,
      details // Array of { CardID, Price, Notes }
    } = req.body

    // Validate required fields
    if (!CustomerID || !SaledBy || !details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CustomerID, SaledBy, and details array are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if Customer exists
    const customer = await Customer.findOne({ ID: CustomerID })
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        }
      })
    }

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: SaledBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    // Validate all cards exist and calculate total
    let totalAmount = 0
    const cardIds = []
    for (const detail of details) {
      if (!detail.CardID || detail.Price === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Each detail must have CardID and Price',
            code: 'INVALID_DETAIL_FORMAT'
          }
        })
      }

      const card = await Card.findOne({ CardID: detail.CardID })
      if (!card) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Card ${detail.CardID} not found`,
            code: 'CARD_NOT_FOUND'
          }
        })
      }

      if (cardIds.includes(detail.CardID)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Duplicate CardID ${detail.CardID} in details`,
            code: 'DUPLICATE_CARD_IN_INVOICE'
          }
        })
      }

      cardIds.push(detail.CardID)
      totalAmount += detail.Price
    }

    // Create invoice
    const invoice = new CardPurchaseInvoice({
      CustomerID,
      SaledBy,
      InvoiceDate: InvoiceDate || new Date(),
      Status: 'PENDING',
      TotalAmount: totalAmount
    })

    const savedInvoice = await invoice.save()

    // Create invoice details
    const detailDocs = details.map(detail => ({
      InvoiceID: savedInvoice.ID,
      CardID: detail.CardID,
      Price: detail.Price,
      Notes: detail.Notes || null
    }))

    await CardPurchaseDetail.insertMany(detailDocs)

    // Get populated invoice with details
    const populatedInvoice = await CardPurchaseInvoice
      .findById(savedInvoice._id)
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate({
        path: 'SaledBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    const invoiceDetails = await CardPurchaseDetail
      .find({ InvoiceID: savedInvoice.ID })
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    res.status(201).json({
      success: true,
      data: {
        ...populatedInvoice.toJSON(),
        details: invoiceDetails
      },
      message: 'Invoice created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_INVOICE_ERROR'
      }
    })
  }
})

// PUT - Update invoice status
cardPurchaseInvoicesRouter.put('/:id', async (req, res) => {
  try {
    const { Status } = req.body

    const invoice = await CardPurchaseInvoice.findById(req.params.id)
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        }
      })
    }

    if (Status !== undefined) {
      const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED']
      if (!validStatuses.includes(Status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            code: 'INVALID_STATUS'
          }
        })
      }
      invoice.Status = Status.toUpperCase()
    }

    const updatedInvoice = await invoice.save()
    const populatedInvoice = await CardPurchaseInvoice
      .findById(updatedInvoice._id)
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate({
        path: 'SaledBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    res.json({
      success: true,
      data: populatedInvoice,
      message: 'Invoice updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_INVOICE_ERROR'
      }
    })
  }
})

// DELETE - Delete invoice (and its details)
cardPurchaseInvoicesRouter.delete('/:id', async (req, res) => {
  try {
    const invoice = await CardPurchaseInvoice.findById(req.params.id)
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        }
      })
    }

    // Check if invoice can be deleted (only PENDING or CANCELLED)
    if (!['PENDING', 'CANCELLED'].includes(invoice.Status)) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Only PENDING or CANCELLED invoices can be deleted',
          code: 'CANNOT_DELETE_INVOICE',
          details: `Invoice status is ${invoice.Status}`
        }
      })
    }

    // Delete invoice details first
    await CardPurchaseDetail.deleteMany({ InvoiceID: invoice.ID })

    // Delete invoice
    await CardPurchaseInvoice.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Invoice and its details deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_INVOICE_ERROR'
      }
    })
  }
})

module.exports = cardPurchaseInvoicesRouter
