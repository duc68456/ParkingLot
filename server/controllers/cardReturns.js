const cardReturnsRouter = require('express').Router()
const CardReturn = require('../models/cardReturn')
const Card = require('../models/card')
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const CardPurchaseDetail = require('../models/cardPurchaseDetail')
const Employee = require('../models/employee')

// GET all card returns with filtering and pagination
cardReturnsRouter.get('/', async (req, res) => {
  try {
    const {
      invoiceId,
      cardId,
      status,
      returnReason,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (invoiceId) {
      filter.InvoiceID = invoiceId
    }

    if (cardId) {
      filter.CardID = cardId
    }

    if (status) {
      filter.Status = status.toUpperCase()
    }

    if (returnReason) {
      filter.ReturnReason = returnReason.toUpperCase()
    }

    // Filter by date range
    if (fromDate || toDate) {
      filter.ReturnRequestDate = {}
      if (fromDate) {
        filter.ReturnRequestDate.$gte = new Date(fromDate)
      }
      if (toDate) {
        filter.ReturnRequestDate.$lte = new Date(toDate)
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await CardReturn.countDocuments(filter)

    const returns = await CardReturn
      .find(filter)
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })
      .populate({
        path: 'ReturnApprovalBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ReturnRequestDate: -1 })

    res.json({
      success: true,
      data: {
        items: returns,
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
        code: 'GET_CARD_RETURNS_ERROR'
      }
    })
  }
})

// GET single card return by ID
cardReturnsRouter.get('/:id', async (req, res) => {
  try {
    const cardReturn = await CardReturn
      .findById(req.params.id)
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })
      .populate({
        path: 'ReturnApprovalBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })

    if (!cardReturn) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardReturn not found',
          code: 'CARD_RETURN_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: cardReturn
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CARD_RETURN_ERROR'
      }
    })
  }
})

// POST - Create new card return request
cardReturnsRouter.post('/', async (req, res) => {
  try {
    const {
      CardID,
      InvoiceID,
      ReturnReason,
      ReturnRequestDate,
      RefundPrice,
      RefundReason,
      Notes
    } = req.body

    // Validate required fields
    if (!CardID || !InvoiceID || !ReturnReason || RefundPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardID, InvoiceID, ReturnReason, and RefundPrice are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if Card exists
    const card = await Card.findOne({ CardID })
    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    // Check if Invoice exists
    const invoice = await CardPurchaseInvoice.findOne({ ID: InvoiceID })
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        }
      })
    }

    // Check if card is in the invoice
    const detail = await CardPurchaseDetail.findOne({
      InvoiceID,
      CardID
    })
    if (!detail) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found in this invoice',
          code: 'CARD_NOT_IN_INVOICE'
        }
      })
    }

    // Check if card already has a return request
    const existingReturn = await CardReturn.findOne({ CardID })
    if (existingReturn) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Card already has a return request',
          code: 'DUPLICATE_CARD_RETURN'
        }
      })
    }

    // Validate RefundPrice
    if (RefundPrice < 0 || RefundPrice > detail.Price) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'RefundPrice must be between 0 and OriginalPrice',
          code: 'INVALID_REFUND_PRICE'
        }
      })
    }

    const cardReturn = new CardReturn({
      CardID,
      InvoiceID,
      ReturnReason: ReturnReason.toUpperCase(),
      ReturnRequestDate: ReturnRequestDate || new Date(),
      OriginalPrice: detail.Price,
      RefundPrice,
      RefundReason: RefundReason || null,
      Status: 'PENDING',
      Notes: Notes || null
    })

    const savedReturn = await cardReturn.save()
    const populatedReturn = await CardReturn
      .findById(savedReturn._id)
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })

    res.status(201).json({
      success: true,
      data: populatedReturn,
      message: 'Card return request created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_CARD_RETURN_ERROR'
      }
    })
  }
})

// PUT - Update card return (approve/reject/process)
cardReturnsRouter.put('/:id', async (req, res) => {
  try {
    const {
      Status,
      ReturnApprovalBy,
      RefundMethod,
      RefundPrice,
      RefundReason,
      Notes
    } = req.body

    const cardReturn = await CardReturn.findById(req.params.id)
    if (!cardReturn) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardReturn not found',
          code: 'CARD_RETURN_NOT_FOUND'
        }
      })
    }

    // Update Status
    if (Status !== undefined) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED']
      if (!validStatuses.includes(Status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            code: 'INVALID_STATUS'
          }
        })
      }

      // If approving or rejecting, need approval by employee
      if (['APPROVED', 'REJECTED'].includes(Status.toUpperCase()) && !ReturnApprovalBy && !cardReturn.ReturnApprovalBy) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'ReturnApprovalBy is required when approving or rejecting',
            code: 'APPROVAL_BY_REQUIRED'
          }
        })
      }

      // If processing, need refund method
      if (Status.toUpperCase() === 'PROCESSED' && !RefundMethod && !cardReturn.RefundMethod) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'RefundMethod is required when processing refund',
            code: 'REFUND_METHOD_REQUIRED'
          }
        })
      }

      cardReturn.Status = Status.toUpperCase()

      // Set RefundTime when status is PROCESSED
      if (Status.toUpperCase() === 'PROCESSED' && !cardReturn.RefundTime) {
        cardReturn.RefundTime = new Date()
      }
    }

    // Validate and update ReturnApprovalBy
    if (ReturnApprovalBy) {
      const employee = await Employee.findOne({ ID: ReturnApprovalBy })
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Employee not found',
            code: 'EMPLOYEE_NOT_FOUND'
          }
        })
      }
      cardReturn.ReturnApprovalBy = ReturnApprovalBy
    }

    if (RefundMethod !== undefined) {
      const validMethods = ['CASH', 'BANK_TRANSFER', 'EWALLET', 'CREDIT']
      if (RefundMethod && !validMethods.includes(RefundMethod.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: {
            message: `RefundMethod must be one of: ${validMethods.join(', ')}`,
            code: 'INVALID_REFUND_METHOD'
          }
        })
      }
      cardReturn.RefundMethod = RefundMethod ? RefundMethod.toUpperCase() : null
    }

    if (RefundPrice !== undefined) {
      if (RefundPrice < 0 || RefundPrice > cardReturn.OriginalPrice) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'RefundPrice must be between 0 and OriginalPrice',
            code: 'INVALID_REFUND_PRICE'
          }
        })
      }
      cardReturn.RefundPrice = RefundPrice
    }

    if (RefundReason !== undefined) cardReturn.RefundReason = RefundReason
    if (Notes !== undefined) cardReturn.Notes = Notes

    const updatedReturn = await cardReturn.save()
    const populatedReturn = await CardReturn
      .findById(updatedReturn._id)
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })
      .populate({
        path: 'ReturnApprovalBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    res.json({
      success: true,
      data: populatedReturn,
      message: 'Card return updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_CARD_RETURN_ERROR'
      }
    })
  }
})

// DELETE - Delete card return (only PENDING or REJECTED)
cardReturnsRouter.delete('/:id', async (req, res) => {
  try {
    const cardReturn = await CardReturn.findById(req.params.id)
    if (!cardReturn) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardReturn not found',
          code: 'CARD_RETURN_NOT_FOUND'
        }
      })
    }

    // Check if return can be deleted
    if (!['PENDING', 'REJECTED'].includes(cardReturn.Status)) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Only PENDING or REJECTED returns can be deleted',
          code: 'CANNOT_DELETE_CARD_RETURN',
          details: `Return status is ${cardReturn.Status}`
        }
      })
    }

    await CardReturn.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Card return deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_CARD_RETURN_ERROR'
      }
    })
  }
})

module.exports = cardReturnsRouter
