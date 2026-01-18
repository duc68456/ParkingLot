const cardsRouter = require('express').Router()
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Person = require('../models/person')
const Employee = require('../models/employee')
const Customer = require('../models/customer')
const Subscription = require('../models/subscription')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')

// Helper: Get vehicle info from active subscription
const getVehicleFromSubscription = async (cardId) => {
  if (!cardId) return null

  const now = new Date()
  const subscription = await Subscription.findOne({
    CardID: cardId,
    IsSuspended: false,
    StartDate: { $lte: now },
    EndDate: { $gte: now }
  }).lean()

  if (!subscription || !subscription.VehicleID) return null

  const vehicle = await Vehicle.findOne({ VehicleID: subscription.VehicleID }).lean()
  if (!vehicle) return null

  const vehicleType = subscription.VehicleTypeID
    ? await VehicleType.findOne({ VehicleTypeID: subscription.VehicleTypeID }).lean()
    : null

  return {
    PlateNumber: vehicle.PlateNumber,
    VehicleTypeName: vehicleType?.Name || null
  }
}

// GET next UID in sequence (for auto-generation)
cardsRouter.get('/next-uid', async (req, res) => {
  try {
    // Find the latest card with a valid UID format (UID-XXXX)
    const latestCard = await Card.findOne(
      { UID: { $regex: /^UID-\d{4}$/ } },
      { UID: 1 },
      { sort: { UID: -1 } }
    )

    let nextNumber = 1
    if (latestCard && latestCard.UID) {
      const match = latestCard.UID.match(/^UID-(\d{4})$/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }

    const nextUid = `UID-${nextNumber.toString().padStart(4, '0')}`

    res.json({
      success: true,
      data: {
        nextUid
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_NEXT_UID_ERROR'
      }
    })
  }
})

// GET all cards with filtering and pagination
cardsRouter.get('/', async (req, res) => {
  try {
    const {
      status,
      isActive,
      cardCategoryId,
      ownerId,
      expired,
      search,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    // New filter: Status (preferred)
    if (status) {
      filter.Status = String(status).toUpperCase()
    }

    // Backwards compat: isActive maps to Status
    if (isActive !== undefined && !status) {
      filter.Status = isActive === 'true' ? 'ACTIVE' : { $ne: 'ACTIVE' }
    }

    if (cardCategoryId) {
      filter.CardCategoryID = cardCategoryId
    }

    if (ownerId) {
      // Card.OwnerID stores the PERSON business ID (Person.ID) when a card is assigned.
      // The UI may pass either:
      // - person ID (e.g. PER0001)
      // - customer ID (e.g. CUS0002)
      // Support both by resolving customer -> person.
      const ownerIdStr = String(ownerId)
      let resolvedOwnerPersonBusinessId = ownerIdStr

      // If a customer ID is provided, map it to the linked Person.ID.
      if (/^CUS\d{4}$/i.test(ownerIdStr)) {
        const customer = await Customer.findOne({ ID: ownerIdStr.toUpperCase() }).select('PersonID')
        if (customer?.PersonID) {
          // Customer.PersonID stores Person.ID (PER####) after the refactor.
          resolvedOwnerPersonBusinessId = String(customer.PersonID)
        }
      }

      filter.OwnerID = resolvedOwnerPersonBusinessId
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

    // Filter by subscription status
    const { hasSubscription } = req.query
    let cardIdsWithSubscription = null
    if (hasSubscription !== undefined) {
      // Get all CardIDs that have subscriptions
      const subscriptions = await Subscription.find({}).select('CardID').lean()
      cardIdsWithSubscription = new Set(subscriptions.map(s => s.CardID))

      if (hasSubscription === 'false') {
        // Only cards WITHOUT subscriptions - will filter after query
      } else if (hasSubscription === 'true') {
        // Only cards WITH subscriptions
        filter.CardID = { $in: Array.from(cardIdsWithSubscription) }
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    let total = await Card.countDocuments(filter)

    const cards = await Card
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    // Manual hydration because CardCategoryID/OwnerID are business IDs (strings), not ObjectIds.
    const categoryIds = Array.from(new Set(cards.map(c => c.CardCategoryID).filter(Boolean)))
    const ownerIds = Array.from(new Set(cards.map(c => c.OwnerID).filter(Boolean)))

    const categories = await CardCategory
      .find({ ID: { $in: categoryIds } })
      .select('ID Name')
    const owners = await Person
      .find({ ID: { $in: ownerIds } })
      .select('ID FullName Phone Gender')

    const categoryById = new Map(categories.map(cat => [cat.ID, cat]))
    const ownerById = new Map(owners.map(p => [p.ID, p]))

    // Get vehicle info from active subscriptions
    let hydratedCards = await Promise.all(cards.map(async (card) => {
      const vehicleInfo = await getVehicleFromSubscription(card.CardID)
      return {
        ...card.toJSON(),
        CardCategoryID: categoryById.get(card.CardCategoryID) || card.CardCategoryID,
        OwnerID: ownerById.get(card.OwnerID) || card.OwnerID,
        VehicleInfo: vehicleInfo
      }
    }))

    // Filter out cards WITH subscriptions if hasSubscription=false
    if (hasSubscription === 'false' && cardIdsWithSubscription) {
      hydratedCards = hydratedCards.filter(c => !cardIdsWithSubscription.has(c.CardID))
      total = hydratedCards.length
    }

    res.json({
      success: true,
      data: {
        items: hydratedCards,
        filtered: hasSubscription !== undefined, // Flag to indicate filtering was applied
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

    const category = await CardCategory.findOne({ ID: card.CardCategoryID }).select('ID Name')
    const owner = card.OwnerID
      ? await Person.findOne({ ID: card.OwnerID }).select('ID FullName Phone Gender')
      : null

    res.json({
      success: true,
      data: {
        ...card.toJSON(),
        CardCategoryID: category || card.CardCategoryID,
        OwnerID: owner || card.OwnerID
      }
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
    const card = await Card.findOne({ UID: req.params.uid })

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
    if (card.Status !== 'ACTIVE') {
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

    const category = await CardCategory.findOne({ ID: card.CardCategoryID }).select('ID Name')
    const owner = card.OwnerID
      ? await Person.findOne({ ID: card.OwnerID }).select('ID FullName Phone Gender')
      : null
    const vehicleInfo = await getVehicleFromSubscription(card.CardID)

    res.json({
      success: true,
      data: {
        ...card.toJSON(),
        CardCategoryID: category || card.CardCategoryID,
        OwnerID: owner || card.OwnerID,
        VehicleInfo: vehicleInfo
      }
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

// POST - Create visitor card (for staff gate)
cardsRouter.post('/create-visitor', async (req, res) => {
  try {
    // Find Visitor category automatically
    const visitorCategory = await CardCategory.findOne({
      $or: [
        { Name: { $regex: /^visitor$/i } },
        { Name: { $regex: /visitor/i } },
        { Name: { $regex: /vãng lai/i } }
      ]
    })

    if (!visitorCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Visitor card category not found. Please create a "Visitor" category first.',
          code: 'VISITOR_CATEGORY_NOT_FOUND'
        }
      })
    }

    // Create visitor card with no owner and no UID
    const card = new Card({
      CardCategoryID: visitorCategory.ID,
      OwnerID: null, // Visitor cards have no owner
      ActiveDay: new Date(),
      ExpireDay: null,
      UID: null, // UID will be assigned when card is scanned
      Status: 'UNASSIGNED',
      UIDScannedAt: null,
      UIDScannedBy: null
    })

    const savedCard = await card.save()

    // Manual hydration
    const category = await CardCategory.findOne({ ID: savedCard.CardCategoryID }).select('ID Name')
    const vehicleInfo = await getVehicleFromSubscription(savedCard.CardID)

    const populatedCard = {
      ...savedCard.toJSON(),
      CardCategoryID: category || savedCard.CardCategoryID,
      OwnerID: null,
      VehicleInfo: vehicleInfo
    }

    res.status(201).json({
      success: true,
      data: populatedCard,
      message: 'Visitor card created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_VISITOR_CARD_ERROR'
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
      ActiveDay,
      ExpireDay,
      UID,
      Status,
      UIDScannedAt,
      UIDScannedBy
    } = req.body

    // Validate required fields
    if (!CardCategoryID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID is required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // UID is required when creating an already-active/assigned card (e.g. employee card flow).
    // Inventory purchase flow creates cards with blank UID.
    const normalizedStatus = Status ? String(Status).toUpperCase() : ''
    const requiresUid = Boolean(OwnerID) || normalizedStatus === 'ACTIVE'
    if (requiresUid && !UID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'UID is required for active/assigned cards',
          code: 'UID_REQUIRED'
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

    // Check if UID already exists (only when provided)
    if (UID) {
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

    // Validate UIDScannedBy if provided
    if (UIDScannedBy) {
      const employee = await Employee.findOne({ ID: UIDScannedBy })
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Employee not found',
            code: 'EMPLOYEE_NOT_FOUND'
          }
        })
      }
    }

    const card = new Card({
      CardCategoryID,
      OwnerID: OwnerID || null,
      ActiveDay: ActiveDay || new Date(),
      ExpireDay: ExpireDay || null,
      UID: UID || null,
      Status: normalizedStatus || undefined,
      UIDScannedAt: UIDScannedAt || null,
      UIDScannedBy: UIDScannedBy || null
    })

    const savedCard = await card.save()

    // Manual hydration because CardCategoryID/OwnerID are business IDs (strings), not ObjectIds.
    const category = await CardCategory.findOne({ ID: savedCard.CardCategoryID }).select('ID Name')
    const owner = savedCard.OwnerID
      ? await Person.findOne({ ID: savedCard.OwnerID }).select('ID FullName Phone Gender')
      : null
    const vehicleInfo = await getVehicleFromSubscription(savedCard.CardID)

    const populatedCard = {
      ...savedCard.toJSON(),
      CardCategoryID: category || savedCard.CardCategoryID,
      OwnerID: owner || savedCard.OwnerID,
      VehicleInfo: vehicleInfo
    }

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

// POST - Assign card to a customer
// Accepts Mongo _id, business CardID, or UID in :id
// Body: { personId: 'PER0001' } (type can be provided but will be ignored unless it's 'customer')
cardsRouter.post('/:id/assign', async (req, res) => {
  try {
    const { type, personId, uid } = req.body || {}
    const assignType = String(type || '').toLowerCase()

    if (!personId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'personId is required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    if (assignType && assignType !== 'customer') {
      return res.status(400).json({
        success: false,
        error: {
          message: "Only customer assignment is supported",
          code: 'CUSTOMER_ONLY'
        }
      })
    }

    // Locate card by Mongo _id first, then by business CardID, then by UID.
    let card = await Card.findById(req.params.id).catch(() => null)
    if (!card) {
      card = await Card.findOne({ CardID: req.params.id })
    }
    if (!card) {
      card = await Card.findOne({ UID: String(req.params.id) })
    }

    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    // Assign only if currently unassigned (prevent accidental reassignment)
    if (String(card.Status || '').toUpperCase() !== 'UNASSIGNED') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Card is not unassigned',
          code: 'CARD_NOT_UNASSIGNED'
        }
      })
    }

    // Validate person exists
    const person = await Person.findOne({ ID: String(personId) })
    if (!person) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Person not found',
          code: 'PERSON_NOT_FOUND'
        }
      })
    }

    const customer = await Customer.findOne({ PersonID: person.ID })
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Customer not found for this person',
          code: 'CUSTOMER_NOT_FOUND'
        }
      })
    }

    // Apply assignment
    card.OwnerID = String(personId)

    // Always require UID in new format when assigning
    const nextUid = String(uid || '').trim()
    if (!nextUid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'UID is required when assigning a card',
          code: 'UID_REQUIRED'
        }
      })
    }

    // Validate new UID format (UID-XXXX)
    const UID_FORMAT_REGEX = /^UID-\d{4}$/
    if (!UID_FORMAT_REGEX.test(nextUid)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'UID must be in format UID-XXXX (e.g. UID-0001)',
          code: 'INVALID_UID_FORMAT'
        }
      })
    }

    // Ensure UID not already used by another card (excluding current card)
    const existing = await Card.findOne({
      UID: nextUid,
      _id: { $ne: card._id }
    })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'UID already exists',
          code: 'UID_ALREADY_EXISTS'
        }
      })
    }

    // Update UID to new format (replacing old UID if exists)
    card.UID = nextUid
    card.UIDScannedAt = new Date()

    // Activate the card
    card.Status = 'ACTIVE'
    if (!card.ActiveDay) card.ActiveDay = new Date()

    const updated = await card.save()

    // Manual hydration
    const category = await CardCategory.findOne({ ID: updated.CardCategoryID }).select('ID Name')
    const owner = await Person.findOne({ ID: updated.OwnerID }).select('ID FullName Phone Gender')
    const vehicleInfo = await getVehicleFromSubscription(updated.CardID)

    res.json({
      success: true,
      data: {
        ...updated.toJSON(),
        CardCategoryID: category || updated.CardCategoryID,
        OwnerID: owner || updated.OwnerID,
        VehicleInfo: vehicleInfo
      },
      message: 'Card assigned successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'ASSIGN_CARD_ERROR'
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
      ActiveDay,
      ExpireDay,
      UID,
      Status,
      UIDScannedAt,
      UIDScannedBy,
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

    if (ActiveDay !== undefined) card.ActiveDay = ActiveDay
    if (ExpireDay !== undefined) card.ExpireDay = ExpireDay

    // New: update status
    if (Status !== undefined) card.Status = String(Status).toUpperCase()

    // Backwards compat: IsActive maps to status if Status not explicitly provided
    if (IsActive !== undefined && Status === undefined) {
      card.Status = IsActive ? 'ACTIVE' : 'INACTIVE'
    }

    if (UIDScannedAt !== undefined) card.UIDScannedAt = UIDScannedAt
    if (UIDScannedBy !== undefined) {
      if (UIDScannedBy === null || UIDScannedBy === '') {
        card.UIDScannedBy = null
      } else {
        const employee = await Employee.findOne({ ID: UIDScannedBy })
        if (!employee) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Employee not found',
              code: 'EMPLOYEE_NOT_FOUND'
            }
          })
        }
        card.UIDScannedBy = UIDScannedBy
      }
    }

    const updatedCard = await card.save()

    // Manual hydration because CardCategoryID/OwnerID are business IDs (strings), not ObjectIds.
    const category = await CardCategory.findOne({ ID: updatedCard.CardCategoryID }).select('ID Name')
    const owner = updatedCard.OwnerID
      ? await Person.findOne({ ID: updatedCard.OwnerID }).select('ID FullName Phone Gender')
      : null
    const vehicleInfo = await getVehicleFromSubscription(updatedCard.CardID)

    const populatedCard = {
      ...updatedCard.toJSON(),
      CardCategoryID: category || updatedCard.CardCategoryID,
      OwnerID: owner || updatedCard.OwnerID,
      VehicleInfo: vehicleInfo
    }

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

    card.Status = 'INACTIVE'
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
