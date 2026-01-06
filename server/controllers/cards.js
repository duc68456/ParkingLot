const cardsRouter = require('express').Router()
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Person = require('../models/person')
const Employee = require('../models/employee')
const Customer = require('../models/customer')

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
          const person = await Person.findById(customer.PersonID).select('ID')
          if (person?.ID) {
            resolvedOwnerPersonBusinessId = String(person.ID)
          }
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

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await Card.countDocuments(filter)

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

    const hydratedCards = cards.map(card => ({
      ...card.toJSON(),
      CardCategoryID: categoryById.get(card.CardCategoryID) || card.CardCategoryID,
      OwnerID: ownerById.get(card.OwnerID) || card.OwnerID
    }))

    res.json({
      success: true,
      data: {
        items: hydratedCards,
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

    const populatedCard = {
      ...savedCard.toJSON(),
      CardCategoryID: category || savedCard.CardCategoryID,
      OwnerID: owner || savedCard.OwnerID
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

    const customer = await Customer.findOne({ PersonID: person._id })
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

    // If UID is not yet known, allow providing it at assignment time (scan/type).
    if (!card.UID) {
      const nextUid = String(uid || '').trim()
      if (!nextUid) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'uid is required to assign a card without UID',
            code: 'UID_REQUIRED'
          }
        })
      }

      // Ensure UID not already used by another card.
      const existing = await Card.findOne({ UID: nextUid })
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'UID already exists',
            code: 'UID_ALREADY_EXISTS'
          }
        })
      }

      card.UID = nextUid
      card.UIDScannedAt = new Date()
    }

    // If RFID is now present, activate; otherwise keep pending.
    card.Status = card.UID ? 'ACTIVE' : 'PENDING_RFID'
    if (!card.ActiveDay) card.ActiveDay = new Date()

    const updated = await card.save()

    // Manual hydration
    const category = await CardCategory.findOne({ ID: updated.CardCategoryID }).select('ID Name')
    const owner = await Person.findOne({ ID: updated.OwnerID }).select('ID FullName Phone Gender')

    res.json({
      success: true,
      data: {
        ...updated.toJSON(),
        CardCategoryID: category || updated.CardCategoryID,
        OwnerID: owner || updated.OwnerID
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

    const populatedCard = {
      ...updatedCard.toJSON(),
      CardCategoryID: category || updatedCard.CardCategoryID,
      OwnerID: owner || updatedCard.OwnerID
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
