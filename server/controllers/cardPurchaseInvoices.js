const cardPurchaseInvoicesRouter = require('express').Router()
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const CardPurchaseDetail = require('../models/cardPurchaseDetail')
const Customer = require('../models/customer')
const Employee = require('../models/employee')
const Card = require('../models/card')
const mongoose = require('mongoose')
const CardCategory = require('../models/cardCategory')
const Person = require('../models/person')

const generateNextInvoiceId = async () => {
  const lastInvoice = await CardPurchaseInvoice.findOne({}, {}, { sort: { ID: -1 } })
  if (lastInvoice?.ID) {
    const lastNumber = parseInt(lastInvoice.ID.substring(3))
    const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1
    return `INV${nextNumber.toString().padStart(4, '0')}`
  }
  return 'INV0001'
}

const generateNextCardId = async (session) => {
  const lastCard = await Card.findOne({}, {}, { sort: { CardID: -1 } }).session(session)
  if (lastCard?.CardID) {
    const lastNumber = parseInt(lastCard.CardID.substring(3))
    const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1
    return `CRD${nextNumber.toString().padStart(4, '0')}`
  }
  return 'CRD0001'
}

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
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ InvoiceDate: -1 })

    // Compute CardsCount per invoice (sum of CardPurchaseDetail.Quantity).
    // This avoids per-row detail fetch in the UI.
    const invoiceBusinessIds = invoices.map((i) => i.ID).filter(Boolean)
    const cardsCountAgg = invoiceBusinessIds.length
      ? await CardPurchaseDetail.aggregate([
        { $match: { InvoiceID: { $in: invoiceBusinessIds } } },
        { $group: { _id: '$InvoiceID', cardsCount: { $sum: '$Quantity' } } }
      ])
      : []
    const cardsCountByInvoiceId = new Map(cardsCountAgg.map((r) => [r._id, r.cardsCount]))

    // Manual "populate" because CustomerID/SaledBy are business IDs (e.g. CUS0001/EMP0001),
    // not Mongo ObjectIds.
    const customerIds = Array.from(new Set(invoices.map(i => i.CustomerID).filter(Boolean)))
    const employeeIds = Array.from(new Set(invoices.map(i => i.SaledBy).filter(Boolean)))

    const customers = await Customer.find({ ID: { $in: customerIds } }).select('ID PersonID Status RegisteredDay')
    const employees = await Employee.find({ ID: { $in: employeeIds } }).select('ID PersonID EmployeeType Status')

    // Resolve Person documents referenced by Customer.PersonID / Employee.PersonID.
    // PersonID may be stored as a PER#### (business ID) or an ObjectId string. Build
    // two lists and query Person by either _id or ID.
    const rawPersonRefs = Array.from(new Set([
      ...customers.map(c => c.PersonID).filter(Boolean),
      ...employees.map(e => e.PersonID).filter(Boolean)
    ]))

    const objectIdRefs = []
    const businessIdRefs = []
    rawPersonRefs.forEach((r) => {
      if (!r) return
      if (mongoose.Types.ObjectId.isValid(String(r))) objectIdRefs.push(String(r))
      else if (/^PER\d{4}$/i.test(String(r))) businessIdRefs.push(String(r).toUpperCase())
    })

    const personQuery = objectIdRefs.length && businessIdRefs.length
      ? { $or: [{ _id: { $in: objectIdRefs } }, { ID: { $in: businessIdRefs } }] }
      : objectIdRefs.length
        ? { _id: { $in: objectIdRefs } }
        : businessIdRefs.length
          ? { ID: { $in: businessIdRefs } }
          : { _id: { $in: [] } }

    const persons = await Person.find(personQuery).select('ID FullName Phone Gender')

    // Build lookup that maps both _id and business ID to the person document
    const personById = new Map()
    persons.forEach((p) => {
      if (p._id) personById.set(p._id.toString(), p)
      if (p.ID) personById.set(String(p.ID), p)
    })

    const customerByBusinessId = new Map(customers.map(c => [c.ID, ({
      ...c.toJSON(),
      PersonID: personById.get(c.PersonID?.toString()) || c.PersonID
    })]))

    const employeeByBusinessId = new Map(employees.map(e => [e.ID, ({
      ...e.toJSON(),
      PersonID: personById.get(e.PersonID?.toString()) || e.PersonID
    })]))

    const hydrated = invoices.map(inv => ({
      ...inv.toJSON(),
      CardsCount: cardsCountByInvoiceId.get(inv.ID) || 0,
      CustomerID: customerByBusinessId.get(inv.CustomerID) || inv.CustomerID,
      SaledBy: employeeByBusinessId.get(inv.SaledBy) || inv.SaledBy
    }))

    res.json({
      success: true,
      data: {
        items: hydrated,
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
    const invoiceIdOrObjectId = req.params.id
    const isObjectId = mongoose.Types.ObjectId.isValid(invoiceIdOrObjectId)

    // UI can pass either Mongo _id or the business invoice ID (e.g. INV0007).
    // Use a safe branch to avoid ObjectId cast errors.
    const invoice = isObjectId
      ? await CardPurchaseInvoice.findById(invoiceIdOrObjectId)
      : await CardPurchaseInvoice.findOne({ ID: invoiceIdOrObjectId })

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
    const details = await CardPurchaseDetail.find({ InvoiceID: invoice.ID })

    const detailCategoryIds = Array.from(
      new Set(details.map(d => d.CardCategoryID).filter(Boolean))
    )
    const categories = await CardCategory
      .find({ ID: { $in: detailCategoryIds } })
      .select('ID Name')
    const categoryById = new Map(categories.map(c => [c.ID, c]))

    const hydratedDetails = details.map(d => ({
      ...d.toJSON(),
      CardCategoryID: categoryById.get(d.CardCategoryID) || d.CardCategoryID
    }))

    const customer = await Customer.findOne({ ID: invoice.CustomerID }).select('ID PersonID Status RegisteredDay')
    const employee = await Employee.findOne({ ID: invoice.SaledBy }).select('ID PersonID EmployeeType Status')

    const rawRefs = [customer?.PersonID, employee?.PersonID].filter(Boolean)
    const objRefs = []
    const bizRefs = []
    rawRefs.forEach((r) => {
      if (!r) return
      if (mongoose.Types.ObjectId.isValid(String(r))) objRefs.push(String(r))
      else if (/^PER\d{4}$/i.test(String(r))) bizRefs.push(String(r).toUpperCase())
    })

    const persons2 = (objRefs.length || bizRefs.length)
      ? await Person.find(objRefs.length && bizRefs.length
        ? { $or: [{ _id: { $in: objRefs } }, { ID: { $in: bizRefs } }] }
        : objRefs.length
          ? { _id: { $in: objRefs } }
          : { ID: { $in: bizRefs } }
      ).select('ID FullName Phone Gender')
      : []

    const personById2 = new Map()
    persons2.forEach((p) => {
      if (p._id) personById2.set(p._id.toString(), p)
      if (p.ID) personById2.set(String(p.ID), p)
    })

    const hydratedInvoice = {
      ...invoice.toJSON(),
      CustomerID: customer
        ? { ...customer.toJSON(), PersonID: personById.get(customer.PersonID?.toString()) || customer.PersonID }
        : invoice.CustomerID,
      SaledBy: employee
        ? { ...employee.toJSON(), PersonID: personById.get(employee.PersonID?.toString()) || employee.PersonID }
        : invoice.SaledBy
    }

    res.json({
      success: true,
      data: {
        ...hydratedInvoice,
        details: hydratedDetails
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
      details // Array of { CardCategoryID, Quantity, UnitPrice, Notes }
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

    // Validate all categories exist and calculate total
    let totalAmount = 0
    const seenCategoryIds = new Set()
    for (const detail of details) {
      if (!detail.CardCategoryID || detail.Quantity === undefined || detail.UnitPrice === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Each detail must have CardCategoryID, Quantity, and UnitPrice',
            code: 'INVALID_DETAIL_FORMAT'
          }
        })
      }

      const qty = Number(detail.Quantity)
      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Quantity must be at least 1',
            code: 'INVALID_QUANTITY'
          }
        })
      }

      const category = await CardCategory.findOne({ ID: detail.CardCategoryID })
      if (!category) {
        return res.status(404).json({
          success: false,
          error: {
            message: `CardCategory ${detail.CardCategoryID} not found`,
            code: 'CARD_CATEGORY_NOT_FOUND'
          }
        })
      }

      // Prevent duplicates per invoice
      if (seenCategoryIds.has(detail.CardCategoryID)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Duplicate CardCategoryID ${detail.CardCategoryID} in details`,
            code: 'DUPLICATE_CATEGORY_IN_INVOICE'
          }
        })
      }

      seenCategoryIds.add(detail.CardCategoryID)

      totalAmount += qty * Number(detail.UnitPrice)
    }

    // Create invoice
    const invoice = new CardPurchaseInvoice({
      ID: await generateNextInvoiceId(),
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
      CardCategoryID: detail.CardCategoryID,
      Quantity: Number(detail.Quantity),
      UnitPrice: Number(detail.UnitPrice),
      Notes: detail.Notes || null
    }))

    await CardPurchaseDetail.insertMany(detailDocs)

    // Get populated invoice with details
    const populatedInvoice = await CardPurchaseInvoice.findById(savedInvoice._id)

    const invoiceDetails = await CardPurchaseDetail.find({ InvoiceID: savedInvoice.ID })

    const invoiceDetailCategoryIds = Array.from(
      new Set(invoiceDetails.map(d => d.CardCategoryID).filter(Boolean))
    )
    const invoiceCategories = await CardCategory
      .find({ ID: { $in: invoiceDetailCategoryIds } })
      .select('ID Name')
    const invoiceCategoryById = new Map(invoiceCategories.map(c => [c.ID, c]))

    const hydratedInvoiceDetails = invoiceDetails.map(d => ({
      ...d.toJSON(),
      CardCategoryID: invoiceCategoryById.get(d.CardCategoryID) || d.CardCategoryID
    }))

    const createdCustomer = await Customer.findOne({ ID: populatedInvoice.CustomerID }).select('ID PersonID Status RegisteredDay')
    const createdEmployee = await Employee.findOne({ ID: populatedInvoice.SaledBy }).select('ID PersonID EmployeeType Status')

    // PersonID fields store BUSINESS IDs (e.g. PER0002), not Mongo ObjectIds.
    // Never query by _id for these values, or Mongoose will throw cast errors.
    const createdPersonIds = [createdCustomer?.PersonID, createdEmployee?.PersonID]
      .filter(Boolean)
      .map(id => id.toString())
    const createdPersons = createdPersonIds.length
      ? await Person.find({ ID: { $in: Array.from(new Set(createdPersonIds)) } }).select('ID FullName Phone Gender')
      : []
    const createdPersonById = new Map(createdPersons.map(p => [p.ID?.toString(), (p.toJSON ? p.toJSON() : p)]))

    const hydratedCreatedInvoice = {
      ...populatedInvoice.toJSON(),
      CustomerID: createdCustomer
        ? { ...createdCustomer.toJSON(), PersonID: createdPersonById.get(createdCustomer.PersonID?.toString()) || createdCustomer.PersonID }
        : populatedInvoice.CustomerID,
      SaledBy: createdEmployee
        ? { ...createdEmployee.toJSON(), PersonID: createdPersonById.get(createdEmployee.PersonID?.toString()) || createdEmployee.PersonID }
        : populatedInvoice.SaledBy
    }

    res.status(201).json({
      success: true,
      data: {
        ...hydratedCreatedInvoice,
        details: hydratedInvoiceDetails
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

// POST - Confirm payment (mark invoice completed and add cards to inventory)
// Creates a new bunch of cards with Status=UNASSIGNED and OwnerID=null.
// NOTE: The invoice details currently store CardIDs; we "clone" those template cards
// into fresh inventory cards, one per detail line.
cardPurchaseInvoicesRouter.post('/:id/confirm-payment', async (req, res) => {
  const session = await mongoose.startSession()
  try {
    const invoiceIdOrObjectId = req.params.id
    await session.withTransaction(async () => {
      const invoice = mongoose.isValidObjectId(invoiceIdOrObjectId)
        ? await CardPurchaseInvoice.findById(invoiceIdOrObjectId).session(session)
        : await CardPurchaseInvoice.findOne({ ID: invoiceIdOrObjectId }).session(session)
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: { message: 'Invoice not found', code: 'INVOICE_NOT_FOUND' }
        })
      }

      if (!['PENDING'].includes(invoice.Status)) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Only PENDING invoices can be confirmed',
            code: 'INVOICE_NOT_CONFIRMABLE',
            details: `Invoice status is ${invoice.Status}`
          }
        })
      }

      const details = await CardPurchaseDetail
        .find({ InvoiceID: invoice.ID })
        .session(session)

      if (!details || details.length === 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Invoice has no details', code: 'INVOICE_NO_DETAILS' }
        })
      }

  // Create fresh inventory cards (UNASSIGNED, no owner, UID not known yet)
      // based on quantities per purchased card category.
      let nextCardId = await generateNextCardId(session)
      let nextCardSeq = parseInt(nextCardId.substring(3))
      if (!Number.isFinite(nextCardSeq)) nextCardSeq = 1

      const newCards = []
      for (const d of details) {
        const qty = Number(d.Quantity)
        for (let i = 0; i < qty; i += 1) {
          newCards.push({
            CardID: `CRD${String(nextCardSeq++).padStart(4, '0')}`,
            CardCategoryID: d.CardCategoryID,
            OwnerID: null,
            ActiveDay: new Date(),
            ExpireDay: null,
            // UID will be scanned/entered later during assignment.
            UID: null,
            Status: 'UNASSIGNED',
            UIDScannedAt: null,
            UIDScannedBy: null
          })
        }
      }

      await Card.insertMany(newCards, { session })

      invoice.Status = 'COMPLETED'
      await invoice.save({ session })
    })

    // Return refreshed invoice
    const updated = mongoose.isValidObjectId(invoiceIdOrObjectId)
      ? await CardPurchaseInvoice.findById(invoiceIdOrObjectId)
      : await CardPurchaseInvoice.findOne({ ID: invoiceIdOrObjectId })
    res.json({
      success: true,
      data: updated,
      message: 'Payment confirmed and cards added to inventory'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message, code: 'CONFIRM_PAYMENT_ERROR' }
    })
  } finally {
    session.endSession()
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
