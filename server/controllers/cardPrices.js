const cardPricesRouter = require('express').Router()
const CardPrice = require('../models/cardPrice')
const CardCategory = require('../models/cardCategory')
const Employee = require('../models/employee')
const Person = require('../models/person')

const populateChangedByEmployee = {
  path: 'ChangedBy',
  select: 'ID EmployeeType',
  localField: 'ChangedBy',
  foreignField: 'ID',
  justOne: true,
  populate: {
    path: 'PersonID',
    select: 'ID FullName Phone'
  }
}

// CardPricePrev stores the *custom* CardPrice.ID (e.g. CPR0003), not Mongo _id.
// Default populate() assumes ObjectId and will throw CastError.
const populateCardPricePrev = {
  path: 'CardPricePrev',
  select: 'ID Price StartDateApply Reason',
  localField: 'CardPricePrev',
  foreignField: 'ID',
  justOne: true
}

// POST - Backfill missing initial prices for categories
// Creates a CardPrice for each CardCategory that currently has no CardPrice.
// Body: { defaultPrice?: number }
cardPricesRouter.post('/backfill-missing', async (req, res) => {
  try {
    const { defaultPrice = 0 } = req.body || {}
    const numericPrice = Number(defaultPrice)

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid defaultPrice',
          code: 'INVALID_DEFAULT_PRICE',
          details: 'defaultPrice must be a non-negative number'
        }
      })
    }

    const changedBy = req.user?.employeeId
    if (!changedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing employeeId in token',
          code: 'MISSING_EMPLOYEE_ID'
        }
      })
    }

    const categories = await CardCategory.find({}, { ID: 1, Name: 1 })
    const categoryIds = categories.map(c => c.ID)

    const existingPrices = await CardPrice.find(
      { CardCategoryID: { $in: categoryIds } },
      { CardCategoryID: 1 }
    )

    const existingSet = new Set(existingPrices.map(p => p.CardCategoryID))
    const missing = categories.filter(c => !existingSet.has(c.ID))

    if (missing.length === 0) {
      return res.json({
        success: true,
        message: 'No missing prices to backfill',
        data: { createdCount: 0, created: [] }
      })
    }

    const created = []
    for (const cat of missing) {
      // Create one initial price per missing category
      // (Using create() so our CardPrice ID auto-generation runs)
      // eslint-disable-next-line no-await-in-loop
      const cp = await CardPrice.create({
        CardCategoryID: cat.ID,
        Price: numericPrice,
        ChangedBy: changedBy,
        Reason: 'Backfilled initial price'
      })
      created.push(cp)
    }

    res.json({
      success: true,
      message: 'Backfilled missing card prices successfully',
      data: {
        createdCount: created.length,
        created
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'BACKFILL_CARD_PRICES_ERROR'
      }
    })
  }
})

// GET all card prices with filtering and pagination
cardPricesRouter.get('/', async (req, res) => {
  try {
    const {
      cardCategoryId,
      changedBy,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (cardCategoryId) {
      filter.CardCategoryID = cardCategoryId
    }

    if (changedBy) {
      filter.ChangedBy = changedBy
    }

    // Filter by date range
    if (fromDate || toDate) {
      filter.StartDateApply = {}
      if (fromDate) {
        filter.StartDateApply.$gte = new Date(fromDate)
      }
      if (toDate) {
        filter.StartDateApply.$lte = new Date(toDate)
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await CardPrice.countDocuments(filter)

    const cardPrices = await CardPrice
      .find(filter)
      // .populate('CardCategoryID', 'ID Name')
      .populate(populateChangedByEmployee)
      .populate(populateCardPricePrev)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    res.json({
      success: true,
      data: {
        items: cardPrices,
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
        code: 'GET_CARD_PRICES_ERROR'
      }
    })
  }
})

// GET single card price by ID
cardPricesRouter.get('/:id', async (req, res) => {
  try {
    const cardPrice = await CardPrice
      .findById(req.params.id)
      // .populate('CardCategoryID', 'ID Name')
      .populate(populateChangedByEmployee)
      .populate(populateCardPricePrev)

    if (!cardPrice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardPrice not found',
          code: 'CARD_PRICE_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: cardPrice
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CARD_PRICE_ERROR'
      }
    })
  }
})

// GET current price for a card category
cardPricesRouter.get('/current/:cardCategoryId', async (req, res) => {
  try {
    const now = new Date()

    const currentPrice = await CardPrice
      .findOne({
        CardCategoryID: req.params.cardCategoryId,
        StartDateApply: { $lte: now }
      })
      // .populate('CardCategoryID', 'ID Name')
      .populate(populateChangedByEmployee)
      .sort({ StartDateApply: -1 })
      .limit(1)

    if (!currentPrice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No current price found for this card category',
          code: 'NO_CURRENT_PRICE'
        }
      })
    }

    res.json({
      success: true,
      data: currentPrice
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CURRENT_PRICE_ERROR'
      }
    })
  }
})

// GET price history for a card category
cardPricesRouter.get('/history/:cardCategoryId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const filter = { CardCategoryID: req.params.cardCategoryId }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await CardPrice.countDocuments(filter)

    const priceHistory = await CardPrice
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    // Manually fetch CardPricePrev records
    const prevIds = [...new Set(priceHistory.map((p) => p.CardPricePrev).filter(Boolean))]
    const prevDocs = prevIds.length
      ? await CardPrice.find({ ID: { $in: prevIds } }).select('ID Price StartDateApply Reason')
      : []
    const prevById = new Map(prevDocs.map((p) => [p.ID, (p.toJSON ? p.toJSON() : p)]))

    // Manually fetch Employee records
    const employeeIds = [...new Set(priceHistory.map((p) => p.ChangedBy).filter(Boolean))]
    const employees = await Employee.find({ ID: { $in: employeeIds } })
    const employeeById = new Map(employees.map((e) => [e.ID, e]))

    // Manually fetch Person records
    const personIds = [...new Set(employees.map((e) => e.PersonID).filter(Boolean))]
    const persons = personIds.length ? await Person.find({ ID: { $in: personIds } }) : []
    const personById = new Map(persons.map((p) => [p.ID, p]))

    // Build response items with populated data
    const items = priceHistory.map((p) => {
      const obj = p.toJSON ? p.toJSON() : p

      // Attach CardPricePrev
      obj.CardPricePrev = obj.CardPricePrev
        ? (prevById.get(obj.CardPricePrev) || null)
        : null

      // Attach ChangedByEmployee with Person data
      const empRaw = employeeById.get(obj.ChangedBy)
      if (empRaw) {
        const personBusinessId = empRaw.PersonID
        const personDoc = personBusinessId ? personById.get(personBusinessId) : null

        obj.ChangedByEmployee = {
          ID: empRaw.ID,
          PersonID: personDoc ? (personDoc.toJSON ? personDoc.toJSON() : personDoc) : personBusinessId,
          EmployeeType: empRaw.EmployeeType,
          HiredDate: empRaw.HiredDate,
          Status: empRaw.Status
        }
      } else {
        obj.ChangedByEmployee = null
      }

      return obj
    })

    res.json({
      success: true,
      data: {
        items,
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
        code: 'GET_PRICE_HISTORY_ERROR'
      }
    })
  }
})

// POST - Create new card price (immutable - never update, only insert)
// New: Authenticated shortcut endpoint to create a new price for a category.
// Uses JWT payload for ChangedBy (request.user.employeeId).
cardPricesRouter.post('/change', async (req, res) => {
  try {
    const { CardCategoryID, Price, StartDateApply, Reason } = req.body

    // Token stores employeeId as Mongo _id string (see adminAccounts login)
    const employeeObjectId = req.user?.employeeId

    if (!CardCategoryID || Price === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID and Price are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    if (!employeeObjectId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'token missing or invalid',
          code: 'TOKEN_INVALID'
        }
      })
    }

    if (Price < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Price must be non-negative',
          code: 'INVALID_PRICE'
        }
      })
    }

    const cardCategory = await CardCategory.findOne({ ID: CardCategoryID })
    if (!cardCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      })
    }

    // employeeId from JWT is a business ID (e.g., EMP0002), not MongoDB ObjectId
    const employee = await Employee.findOne({ ID: employeeObjectId })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    const startDate = StartDateApply ? new Date(StartDateApply) : new Date()
    const previousPrice = await CardPrice
      .findOne({
        CardCategoryID,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const cardPrice = new CardPrice({
      CardCategoryID,
      Price,
      StartDateApply: startDate,
      // CardPrice.ChangedBy is a string ref to Employee (by its custom ID), not ObjectId.
      ChangedBy: employee.ID,
      Reason: Reason || null,
      CardPricePrev: previousPrice ? previousPrice.ID : null
    })

    const savedCardPrice = await cardPrice.save()

    res.status(201).json({
      success: true,
      data: savedCardPrice,
      message: 'CardPrice created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_CARD_PRICE_ERROR'
      }
    })
  }
})

cardPricesRouter.post('/', async (req, res) => {
  try {
    const {
      CardCategoryID,
      Price,
      StartDateApply,
      ChangedBy,
      Reason
    } = req.body

    // Validate required fields
    if (!CardCategoryID || Price === undefined || !ChangedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID, Price, and ChangedBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Validate price is non-negative
    if (Price < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Price must be non-negative',
          code: 'INVALID_PRICE'
        }
      })
    }

    // Check if CardCategory exists
    const cardCategory = await CardCategory.findOne({ ID: CardCategoryID })
    if (!cardCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      })
    }

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: ChangedBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    // Get previous price for this card category (most recent before new start date)
    const startDate = StartDateApply ? new Date(StartDateApply) : new Date()
    const previousPrice = await CardPrice
      .findOne({
        CardCategoryID,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const cardPrice = new CardPrice({
      CardCategoryID,
      Price,
      StartDateApply: startDate,
      ChangedBy,
      Reason: Reason || null,
      CardPricePrev: previousPrice ? previousPrice.ID : null
    })

    const savedCardPrice = await cardPrice.save()
    const populatedCardPrice = savedCardPrice

    res.status(201).json({
      success: true,
      data: populatedCardPrice,
      message: 'CardPrice created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_CARD_PRICE_ERROR'
      }
    })
  }
})

// Note: No PUT endpoint - CardPrice is immutable (price history pattern)
// To change price, create a new CardPrice record with new StartDateApply

// DELETE - Hard delete (only for corrections, not normal operations)
cardPricesRouter.delete('/:id', async (req, res) => {
  try {
    const idOrCustomId = req.params.id

    // Support both Mongo _id and custom CardPrice.ID (CPR####)
    const cardPrice = await CardPrice.findOne({
      $or: [
        { _id: idOrCustomId },
        { ID: idOrCustomId }
      ]
    })
    if (!cardPrice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardPrice not found',
          code: 'CARD_PRICE_NOT_FOUND'
        }
      })
    }

    // Check if other prices reference this as CardPricePrev
    const referencingPrices = await CardPrice.countDocuments({
      CardPricePrev: cardPrice.ID
    })

    if (referencingPrices > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot delete price that is referenced in price history chain',
          code: 'PRICE_REFERENCED_IN_HISTORY',
          details: `${referencingPrices} price record(s) reference this price`
        }
      })
    }

    await CardPrice.deleteOne({ _id: cardPrice._id })

    res.json({
      success: true,
      message: 'CardPrice deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_CARD_PRICE_ERROR'
      }
    })
  }
})

module.exports = cardPricesRouter
