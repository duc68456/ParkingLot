const cardsRouter = require('express').Router()
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Person = require('../models/person')
const Vehicle = require('../models/vehicle')

// GET all cards with filtering and pagination
cardsRouter.get('/', async (req, res) => {
  try {
    const {
      isActive,
      cardCategoryId,
      ownerId,
      vehicleId,
      expired,
      search,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (isActive !== undefined) {
      filter.IsActive = isActive === 'true'
    }

    if (cardCategoryId) {
      filter.CardCategoryID = cardCategoryId
    }

    if (ownerId) {
      filter.OwnerID = ownerId
    }

    if (vehicleId) {
      filter.VehicleId = vehicleId
    }

    // Filter by expiration status
    if (expired !== undefined) {
      const now = new Date()
      if (expired === 'true') {
        filter.ExpireDay = { $lt: now }
      } else {
        filter.$or = [
          { ExpireDay: null },
          { ExpireDay: { $gte: now } }
        ]
      }
    }

    if (search) {
      filter.$or = [
        { CardID: { $regex: search, $options: 'i' } },
        { UID: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await Card.countDocuments(filter)

    const cards = await Card
      .find(filter)
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'OwnerID',
        select: 'ID FullName Phone'
      })
      .populate({
        path: 'VehicleId',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        items: cards,
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
        code: 'GET_CARDS_ERROR'
      }
    })
  }
})

// GET single card by ID
cardsRouter.get('/:id', async (req, res) => {
  try {
    const card = await Card
      .findById(req.params.id)
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'OwnerID',
        select: 'ID FullName Phone Gender'
      })
      .populate({
        path: 'VehicleId',
        select: 'VehicleID PlateNumber Color Status',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })

    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: card
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CARD_ERROR'
      }
    })
  }
})

// GET card by UID (for RFID scanning)
cardsRouter.get('/uid/:uid', async (req, res) => {
  try {
    const card = await Card
      .findOne({ UID: req.params.uid })
      .populate('CardCategoryID', 'ID Name')
      .populate({
        path: 'OwnerID',
        select: 'ID FullName Phone'
      })
      .populate({
        path: 'VehicleId',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })

    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    // Check if card is active
    if (!card.IsActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Card is not active',
          code: 'CARD_INACTIVE'
        }
      })
    }

    // Check if card is expired
    if (card.ExpireDay && new Date(card.ExpireDay) < new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Card has expired',
          code: 'CARD_EXPIRED',
          details: `Expired on ${card.ExpireDay.toISOString()}`
        }
      })
    }

    res.json({
      success: true,
      data: card
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CARD_BY_UID_ERROR'
      }
    })
  }
})

// POST - Create new card
cardsRouter.post('/', async (req, res) => {
  try {
    const {
      CardCategoryID,
      OwnerID,
      VehicleId,
      ActiveDay,
      ExpireDay,
      UID
    } = req.body

    // Validate required fields
    if (!CardCategoryID || !UID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID and UID are required',
          code: 'MISSING_REQUIRED_FIELDS'
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

    // Check if UID already exists
    const existingCard = await Card.findOne({ UID })
    if (existingCard) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Card with this UID already exists',
          code: 'DUPLICATE_UID'
        }
      })
    }

    // Validate OwnerID if provided
    if (OwnerID) {
      const owner = await Person.findOne({ ID: OwnerID })
      if (!owner) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Owner (Person) not found',
            code: 'OWNER_NOT_FOUND'
          }
        })
      }
    }

    // Validate VehicleId if provided
    if (VehicleId) {
      const vehicle = await Vehicle.findOne({ VehicleID: VehicleId })
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Vehicle not found',
            code: 'VEHICLE_NOT_FOUND'
          }
        })
      }
    }

    const card = new Card({
      CardCategoryID,
      OwnerID: OwnerID || null,
      VehicleId: VehicleId || null,
      ActiveDay: ActiveDay || new Date(),
      ExpireDay: ExpireDay || null,
      UID
    })

    const savedCard = await card.save()
    const populatedCard = await Card
      .findById(savedCard._id)
      .populate('CardCategoryID', 'ID Name')
      .populate('OwnerID', 'ID FullName Phone')
      .populate({
        path: 'VehicleId',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })

    res.status(201).json({
      success: true,
      data: populatedCard,
      message: 'Card created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_CARD_ERROR'
      }
    })
  }
})

// PUT - Update card
cardsRouter.put('/:id', async (req, res) => {
  try {
    const {
      CardCategoryID,
      OwnerID,
      VehicleId,
      ActiveDay,
      ExpireDay,
      UID,
      IsActive
    } = req.body

    const card = await Card.findById(req.params.id)
    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    // If updating UID, check for duplicates
    if (UID && UID !== card.UID) {
      const existingCard = await Card.findOne({
        UID,
        _id: { $ne: req.params.id }
      })
      if (existingCard) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Card with this UID already exists',
            code: 'DUPLICATE_UID'
          }
        })
      }
      card.UID = UID
    }

    // Validate and update CardCategoryID
    if (CardCategoryID && CardCategoryID !== card.CardCategoryID) {
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
      card.CardCategoryID = CardCategoryID
    }

    // Validate and update OwnerID
    if (OwnerID !== undefined) {
      if (OwnerID === null || OwnerID === '') {
        card.OwnerID = null
      } else {
        const owner = await Person.findOne({ ID: OwnerID })
        if (!owner) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Owner (Person) not found',
              code: 'OWNER_NOT_FOUND'
            }
          })
        }
        card.OwnerID = OwnerID
      }
    }

    // Validate and update VehicleId
    if (VehicleId !== undefined) {
      if (VehicleId === null || VehicleId === '') {
        card.VehicleId = null
      } else {
        const vehicle = await Vehicle.findOne({ VehicleID: VehicleId })
        if (!vehicle) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Vehicle not found',
              code: 'VEHICLE_NOT_FOUND'
            }
          })
        }
        card.VehicleId = VehicleId
      }
    }

    if (ActiveDay !== undefined) card.ActiveDay = ActiveDay
    if (ExpireDay !== undefined) card.ExpireDay = ExpireDay
    if (IsActive !== undefined) card.IsActive = IsActive

    const updatedCard = await card.save()
    const populatedCard = await Card
      .findById(updatedCard._id)
      .populate('CardCategoryID', 'ID Name')
      .populate('OwnerID', 'ID FullName Phone')
      .populate({
        path: 'VehicleId',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })

    res.json({
      success: true,
      data: populatedCard,
      message: 'Card updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_CARD_ERROR'
      }
    })
  }
})

// DELETE - Soft delete card
cardsRouter.delete('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    card.IsActive = false
    await card.save()

    res.json({
      success: true,
      message: 'Card deactivated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_CARD_ERROR'
      }
    })
  }
})

module.exports = cardsRouter
