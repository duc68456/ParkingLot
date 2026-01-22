const cardReturnLogsRouter = require('express').Router()
const CardReturnLog = require('../models/cardReturnLog')
const Card = require('../models/card')
const Person = require('../models/person')
const CardCategory = require('../models/cardCategory')
const CardPrice = require('../models/cardPrice')

/**
 * GET /api/card-return-logs
 * List all card return logs with pagination
 */
cardReturnLogsRouter.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = {}

    // Filter by performer
    if (req.query.performedBy) {
      filter.PerformedBy = req.query.performedBy
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {}
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate)
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate)
      }
    }

    const total = await CardReturnLog.countDocuments(filter)
    const logs = await CardReturnLog
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Populate card and owner info for display
    const populatedLogs = await Promise.all(logs.map(async (log) => {
      const card = await Card.findOne({ CardID: log.CardID }).lean()
      const category = card ? await CardCategory.findOne({ ID: card.CardCategoryID }).lean() : null
      const owner = await Person.findOne({ ID: log.OwnerID }).lean()
      const performer = await Person.findOne({ ID: log.PerformedBy }).lean()

      return {
        ...log,
        CardInfo: card ? {
          CardID: card.CardID,
          UID: card.UID,
          CategoryName: category?.Name || '-'
        } : null,
        OwnerInfo: owner ? {
          ID: owner.ID,
          FullName: owner.FullName
        } : null,
        PerformerInfo: performer ? {
          ID: performer.ID,
          FullName: performer.FullName
        } : null
      }
    }))

    res.json({
      success: true,
      data: {
        items: populatedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching card return logs:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch card return logs' }
    })
  }
})

/**
 * GET /api/card-return-logs/stats
 * Get return statistics for dashboard/reports
 */
cardReturnLogsRouter.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filter = {}

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    const totalReturns = await CardReturnLog.countDocuments(filter)

    const refundStats = await CardReturnLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$RefundPrice' },
          avgRefund: { $avg: '$RefundPrice' }
        }
      }
    ])

    res.json({
      success: true,
      data: {
        totalReturns,
        totalRefunded: refundStats[0]?.totalRefunded || 0,
        avgRefund: refundStats[0]?.avgRefund || 0
      }
    })
  } catch (error) {
    console.error('Error fetching return stats:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch return statistics' }
    })
  }
})

/**
 * GET /api/card-return-logs/assigned-cards
 * Get list of assigned cards that can be returned
 */
cardReturnLogsRouter.get('/assigned-cards', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Find cards that are assigned (have OwnerID and status is ACTIVE)
    const filter = {
      OwnerID: { $ne: null },
      Status: 'ACTIVE'
    }

    // Filter by category
    if (req.query.categoryId) {
      filter.CardCategoryID = req.query.categoryId
    }

    const total = await Card.countDocuments(filter)
    const cards = await Card
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Populate owner, category and current price info
    const populatedCards = await Promise.all(cards.map(async (card) => {
      const owner = await Person.findOne({ ID: card.OwnerID }).lean()
      const category = await CardCategory.findOne({ ID: card.CardCategoryID }).lean()

      // Get current price for this card category
      const now = new Date()
      const currentPrice = await CardPrice
        .findOne({
          CardCategoryID: card.CardCategoryID,
          StartDateApply: { $lte: now }
        })
        .sort({ StartDateApply: -1 })
        .limit(1)
        .lean()

      return {
        ...card,
        OwnerInfo: owner ? {
          ID: owner.ID,
          FullName: owner.FullName,
          Phone: owner.Phone
        } : null,
        CategoryInfo: category ? {
          ID: category.ID,
          Name: category.Name
        } : null,
        CurrentPrice: currentPrice ? currentPrice.Price : 0
      }
    }))

    res.json({
      success: true,
      data: {
        items: populatedCards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching assigned cards:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch assigned cards' }
    })
  }
})

/**
 * GET /api/card-return-logs/:id
 * Get single return log by ID
 */
cardReturnLogsRouter.get('/:id', async (req, res) => {
  try {
    // Use business ID (CRL0001) field
    const log = await CardReturnLog.findOne({ ID: req.params.id }).lean()

    if (!log) {
      return res.status(404).json({
        success: false,
        error: { message: 'Card return log not found' }
      })
    }

    res.json({ success: true, data: log })
  } catch (error) {
    console.error('Error fetching card return log:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch card return log' }
    })
  }
})

/**
 * POST /api/card-return-logs/return-card
 * Process a card return - creates log and updates card status
 */
cardReturnLogsRouter.post('/return-card', async (req, res) => {
  try {
    const { cardId, reason, refundPrice, performedBy } = req.body

    // Validate required fields
    if (!cardId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Card ID is required' }
      })
    }

    if (!performedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Performer ID is required' }
      })
    }

    // Find the card - use CardID field (business ID like CRD0084)
    const card = await Card.findOne({ CardID: cardId }).lean()

    if (!card) {
      return res.status(404).json({
        success: false,
        error: { message: 'Card not found' }
      })
    }

    if (!card.OwnerID) {
      return res.status(400).json({
        success: false,
        error: { message: 'Card is not assigned to anyone' }
      })
    }

    if (card.Status === 'RETURNED') {
      return res.status(400).json({
        success: false,
        error: { message: 'Card has already been returned' }
      })
    }

    // Determine owner type
    const Customer = require('../models/customer')
    const Employee = require('../models/employee')
    let ownerType = 'CUSTOMER'

    const isEmployee = await Employee.findOne({ PersonID: card.OwnerID }).lean()
    if (isEmployee) {
      ownerType = 'EMPLOYEE'
    }

    // Create the return log
    const returnLog = new CardReturnLog({
      CardID: card.CardID || card._id.toString(),
      OwnerID: card.OwnerID,
      OwnerType: ownerType,
      RefundPrice: Number(refundPrice) || 0,
      PerformedBy: performedBy,
      Reason: reason || null
    })

    await returnLog.save()

    // Update card status and clear owner
    await Card.findByIdAndUpdate(card._id, {
      Status: 'RETURNED',
      OwnerID: null,
      ExpireDay: null
    })

    res.status(201).json({
      success: true,
      data: returnLog,
      message: 'Card returned successfully'
    })
  } catch (error) {
    console.error('Error processing card return:', error)
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to process card return' }
    })
  }
})

module.exports = cardReturnLogsRouter
