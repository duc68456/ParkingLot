const cardPricesRouter = require('express').Router()
const CardPrice = require('../models/cardPrice')
const CardCategory = require('../models/cardCategory')
const Employee = require('../models/employee')

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
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('CardPricePrev', 'ID Price StartDateApply')
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
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate('CardPricePrev', 'ID Price StartDateApply Reason')

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
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
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
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('CardPricePrev', 'ID Price StartDateApply')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    res.json({
      success: true,
      data: {
        items: priceHistory,
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
    const populatedCardPrice = await CardPrice
      .findById(savedCardPrice._id)
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('CardPricePrev', 'ID Price StartDateApply')

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
    const cardPrice = await CardPrice.findById(req.params.id)
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

    await CardPrice.findByIdAndDelete(req.params.id)

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
