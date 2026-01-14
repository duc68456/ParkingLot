const entrySessionsRouter = require('express').Router()
const EntrySession = require('../models/entrySession')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Employee = require('../models/employee')
const Subscription = require('../models/subscription')
const SinglePricingRule = require('../models/singlePricingRule')
const { getLPClient } = require('../utils/lpClient')
const config = require('../utils/config')

const isAdmin = (req) => req?.user?.type === 'admin'
const isStaff = (req) => req?.user?.type === 'staff'

// Staff can only perform gate operations (query/create entry/process exit).
// Admin can do everything.
const requireAdminOrStaff = (req, res) => {
  if (!isAdmin(req) && !isStaff(req)) {
    res.status(403).json({
      success: false,
      error: { message: 'forbidden', code: 'FORBIDDEN' }
    })
    return false
  }
  return true
}

const requireAdmin = (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({
      success: false,
      error: { message: 'forbidden', code: 'FORBIDDEN' }
    })
    return false
  }
  return true
}

// Helper function to calculate parking fee
const calculateParkingFee = async (entryTime, exitTime, cardCategoryId, vehicleTypeId) => {
  try {
    // Get current pricing rule
    const now = new Date()
    const pricingRule = await SinglePricingRule
      .findOne({
        CardCategoryID: cardCategoryId,
        VehicleTypeID: vehicleTypeId,
        StartDateApply: { $lte: now }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    if (!pricingRule) {
      return 0 // No pricing rule found
    }

    // Calculate duration in hours
    const durationMs = new Date(exitTime) - new Date(entryTime)
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60))

    if (durationHours <= 0) {
      return 0
    }

    // Calculate fee
    let fee = 0
    if (durationHours === 1) {
      fee = pricingRule.HourPrice
    } else {
      fee = pricingRule.HourPrice + (durationHours - 1) * pricingRule.NextHourPrice
    }

    // Check if day price is cheaper (for full day parking)
    if (durationHours >= 24) {
      const days = Math.ceil(durationHours / 24)
      const dayFee = days * pricingRule.DayPrice
      fee = Math.min(fee, dayFee)
    }

    return fee
  } catch (error) {
    console.error('Error calculating parking fee:', error)
    return 0
  }
}

// Helper function to check valid subscription
const checkSubscription = async (cardId) => {
  const now = new Date()
  const subscription = await Subscription.findOne({
    CardID: cardId,
    IsSuspended: false,
    StartDate: { $lte: now },
    EndDate: { $gte: now }
  })
  return subscription
}

const isObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)

const resolveCardCategory = async (cardCategoryIdOrBusinessId) => {
  if (!cardCategoryIdOrBusinessId) return null
  const raw = String(cardCategoryIdOrBusinessId)
  const byIdField = await CardCategory.findOne({ ID: raw }).select('ID Name').lean()
  if (byIdField) return byIdField
  if (isObjectId(raw)) {
    const byObjectId = await CardCategory.findById(raw).select('ID Name').lean()
    if (byObjectId) return byObjectId
  }
  return null
}

const resolveCardByBusinessId = async (cardId) => {
  if (!cardId) return null
  const card = await Card.findOne({ CardID: String(cardId).trim() }).lean()
  if (!card) return null
  const category = await resolveCardCategory(card.CardCategoryID)
  if (category) card.CardCategoryID = category
  return card
}

const normalizeCategoryName = (name) => String(name || '').trim().toLowerCase()

// GET all entry sessions with filtering and pagination (admin only)
entrySessionsRouter.get('/', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return

    const {
      vehicleId,
      cardId,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (vehicleId) {
      filter.VehicleID = vehicleId
    }

    if (cardId) {
      filter.CardID = cardId
    }

    if (status) {
      filter.Status = status.toUpperCase()
    }

    // Filter by date range
    if (fromDate || toDate) {
      filter.EntryTime = {}
      if (fromDate) {
        filter.EntryTime.$gte = new Date(fromDate)
      }
      if (toDate) {
        filter.EntryTime.$lte = new Date(toDate)
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await EntrySession.countDocuments(filter)

    const rawSessions = await EntrySession
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ EntryTime: -1 })
      .lean()

    const hydrateSession = async (s) => {
      const [vt, v, c, pe, px] = await Promise.all([
        s?.VehicleTypeID ? VehicleType.findOne({ VehicleTypeID: String(s.VehicleTypeID) }).select('VehicleTypeID Name').lean() : null,
        s?.VehicleID ? Vehicle.findOne({ VehicleID: String(s.VehicleID) }).select('VehicleID PlateNumber Color VehicleTypeID').lean() : null,
        s?.CardID ? resolveCardByBusinessId(s.CardID) : null,
        s?.ProcessedEntryBy ? Employee.findOne({ ID: String(s.ProcessedEntryBy) }).populate({ path: 'PersonID', select: 'ID FullName' }).lean() : null,
        s?.ProcessedExitBy ? Employee.findOne({ ID: String(s.ProcessedExitBy) }).populate({ path: 'PersonID', select: 'ID FullName' }).lean() : null
      ])

      if (vt) s.VehicleTypeID = vt
      if (v) {
        if (v.VehicleTypeID) {
          const vType = await VehicleType.findOne({ VehicleTypeID: String(v.VehicleTypeID) }).select('VehicleTypeID Name').lean()
          if (vType) v.VehicleTypeID = vType
        }
        s.VehicleID = v
      }
      if (c) s.CardID = c
      if (pe) s.ProcessedEntryBy = pe
      if (px) s.ProcessedExitBy = px

      return s
    }

    const sessions = await Promise.all(rawSessions.map(hydrateSession))

    res.json({
      success: true,
      data: {
        items: sessions,
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
        code: 'GET_ENTRY_SESSIONS_ERROR'
      }
    })
  }
})

/**
 * GET /api/entry-sessions/gate/query
 * Staff-friendly lookup for gate UI.
 * Query params:
 *  - cardId (business CardID)
 *  - licensePlate
 * Returns:
 *  - activeSession (if card has IN_PARKING)
 *  - card (if found)
 *  - vehicle (if found by plate)
 *  - subscriptionActive (boolean)
 */
entrySessionsRouter.get('/gate/query', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const cardId = String(req.query.cardId || '').trim()
    const licensePlate = String(req.query.licensePlate || '').trim().toUpperCase()

    if (!cardId && !licensePlate) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'cardId or licensePlate is required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    let card = cardId
      ? await Card.findOne({ CardID: cardId }).lean()
      : null

    // Backward/forward compatibility:
    // - Card.CardCategoryID is a string business ID (e.g. CCG0008)
    // - Older data might store an ObjectId
    if (card?.CardCategoryID) {
      const raw = String(card.CardCategoryID)
      const byIdField = await CardCategory.findOne({ ID: raw }).select('ID Name').lean()
      if (byIdField) {
        card.CardCategoryID = byIdField
      } else if (raw.match(/^[0-9a-fA-F]{24}$/)) {
        const byObjectId = await CardCategory.findById(raw).select('ID Name').lean()
        if (byObjectId) card.CardCategoryID = byObjectId
      }
    }

    const vehicle = licensePlate
      ? await Vehicle.findOne({ PlateNumber: licensePlate }).populate({
        path: 'VehicleTypeID',
        select: 'VehicleTypeID Name'
      })
      : null

    const activeSession = cardId
      ? await EntrySession.findOne({ CardID: cardId, Status: 'IN_PARKING' })
        .populate({
          path: 'VehicleID',
          select: 'VehicleID PlateNumber',
          populate: { path: 'VehicleTypeID', select: 'VehicleTypeID Name' }
        })
        .populate('VehicleTypeID', 'VehicleTypeID Name')
        .populate({
          path: 'CardID',
          select: 'CardID UID CardCategoryID',
          populate: { path: 'CardCategoryID', select: 'ID Name' }
        })
        .populate({
          path: 'ProcessedEntryBy',
          select: 'ID',
          populate: { path: 'PersonID', select: 'FullName' }
        })
        .lean()
      : null

    if (activeSession?.CardID?.CardCategoryID) {
      const raw = String(activeSession.CardID.CardCategoryID)
      const byIdField = await CardCategory.findOne({ ID: raw }).select('ID Name').lean()
      if (byIdField) {
        activeSession.CardID.CardCategoryID = byIdField
      } else if (raw.match(/^[0-9a-fA-F]{24}$/)) {
        const byObjectId = await CardCategory.findById(raw).select('ID Name').lean()
        if (byObjectId) activeSession.CardID.CardCategoryID = byObjectId
      }
    }

    // Subscription details for gate UI rules
    const subscription = cardId
      ? await checkSubscription(cardId)
      : null

    const subscriptionActive = Boolean(subscription)

    let subscriptionVehicle = null
    let subscriptionVehicleType = null

    if (subscription?.VehicleID) {
      subscriptionVehicle = await Vehicle
        .findOne({ VehicleID: String(subscription.VehicleID).trim() })
        .populate({
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        })
        .lean()
    }

    if (subscription?.VehicleTypeID) {
      subscriptionVehicleType = await VehicleType
        .findOne({ VehicleTypeID: String(subscription.VehicleTypeID).trim() })
        .select('VehicleTypeID Name')
        .lean()
    }

    // Compute gate hints for client so it can display consistently
    const cardCategoryName =
      card?.CardCategoryID?.Name ||
      activeSession?.CardID?.CardCategoryID?.Name ||
      ''
    const isVisitorCard = normalizeCategoryName(cardCategoryName) === 'visitor'

    const subscriptionPlate = String(subscriptionVehicle?.PlateNumber || '').trim().toUpperCase()
    const inputPlate = String(licensePlate || '').trim().toUpperCase()

    // Rules:
    // - Visitor card: queried plate => Instant
    // - Non-visitor + ACTIVE subscription: queried plate => subscription vehicle plate
    // - Non-visitor + no ACTIVE subscription: queried plate => Instant
    let queriedPlateMode = 'INSTANT'
    let queriedPlate = 'Instant'

    if (!isVisitorCard && subscriptionActive) {
      queriedPlateMode = 'SUBSCRIPTION'
      queriedPlate = subscriptionPlate || 'Instant'
    }

    return res.json({
      success: true,
      data: {
        activeSession,
        card,
        vehicle,
        subscriptionActive,
        subscription: subscription
          ? {
            ID: subscription.ID,
            CardID: subscription.CardID,
            VehicleID: subscription.VehicleID,
            VehicleTypeID: subscription.VehicleTypeID,
            StartDate: subscription.StartDate,
            EndDate: subscription.EndDate
          }
          : null,
        subscriptionVehicle,
        subscriptionVehicleType,
        gate: {
          isVisitorCard,
          queriedPlateMode,
          queriedPlate,
          inputPlate,
          subscriptionPlate
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GATE_QUERY_ERROR' }
    })
  }
})

/**
 * GET /api/entry-sessions/gate/active-latest
 * Staff-friendly endpoint for the standby screen.
 * Returns the latest active (IN_PARKING) entry session.
 */
entrySessionsRouter.get('/gate/active-latest', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const session = await EntrySession
      .findOne({ Status: 'IN_PARKING' })
      .sort({ EntryTime: -1 })
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: { path: 'VehicleTypeID', select: 'VehicleTypeID Name' }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: { path: 'CardCategoryID', select: 'ID Name' }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID',
        populate: { path: 'PersonID', select: 'FullName' }
      })
      .lean()

    return res.json({
      success: true,
      data: {
        hasActiveSession: Boolean(session),
        session: session || null
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GET_ACTIVE_LATEST_SESSION_ERROR' }
    })
  }
})

/**
 * POST /api/entry-sessions/gate/entry
 * Implements staff entry workflow:
 * - Query card + subscription + vehicle
 * - Decide whether to create session now or instruct staff to issue visitor card
 *
 * Body:
 *  - CardID (business id)
 *  - LicensePlate
 *  - VehicleTypeID (business id)
 *  - ProcessedEntryBy (employee business id)
 */
entrySessionsRouter.post('/gate/entry', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const CardID = String(req.body.CardID || '').trim()
    const LicensePlate = String(req.body.LicensePlate || '').trim().toUpperCase()
    let VehicleTypeID = String(req.body.VehicleTypeID || '').trim()
    let ProcessedEntryBy = String(req.body.ProcessedEntryBy || '').trim()

    // Staff tokens include employeeId/employeeBusinessId, so the client doesn't need to send it.
    if (!ProcessedEntryBy) {
      ProcessedEntryBy = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim()
    }

    if (!CardID || !ProcessedEntryBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardID and ProcessedEntryBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    const employee = await Employee.findOne({ ID: ProcessedEntryBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
      })
    }

    const existingSession = await EntrySession.findOne({ CardID, Status: 'IN_PARKING' })
    if (existingSession) {
      return res.status(409).json({
        success: false,
        error: { message: 'Card already has an active parking session', code: 'ACTIVE_SESSION_EXISTS' }
      })
    }

    const card = await resolveCardByBusinessId(CardID)
    if (!card) {
      return res.status(404).json({
        success: false,
        error: { message: 'Card not found', code: 'CARD_NOT_FOUND' }
      })
    }

    // Card.Status is the current field (replaces IsActive). Treat non-ACTIVE as not usable.
    if (card.Status && card.Status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { message: 'Card is not active', code: 'CARD_INACTIVE' }
      })
    }

    // Check if card has expired
    if (card.ExpireDay && new Date(card.ExpireDay) < new Date()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Card has expired', code: 'CARD_EXPIRED' }
      })
    }

    const categoryName = normalizeCategoryName(card?.CardCategoryID?.Name)
    const isVisitorCard = categoryName === 'visitor'

    const enrichSession = async (savedDoc) => {
      if (!savedDoc?._id) return savedDoc

      const base = await EntrySession.findById(savedDoc._id).lean()
      if (!base) return savedDoc

      const [vt, v, c] = await Promise.all([
        base.VehicleTypeID ? VehicleType.findOne({ VehicleTypeID: String(base.VehicleTypeID) }).select('VehicleTypeID Name').lean() : null,
        base.VehicleID ? Vehicle.findOne({ VehicleID: String(base.VehicleID) }).select('VehicleID PlateNumber VehicleTypeID').lean() : null,
        base.CardID ? resolveCardByBusinessId(base.CardID) : null
      ])

      if (vt) base.VehicleTypeID = vt
      if (v) {
        // Optionally attach vehicle type details for the vehicle.
        if (v.VehicleTypeID) {
          const vType = await VehicleType.findOne({ VehicleTypeID: String(v.VehicleTypeID) }).select('VehicleTypeID Name').lean()
          if (vType) v.VehicleTypeID = vType
        }
        base.VehicleID = v
      }
      if (c) base.CardID = c

      return base
    }

    // Best-effort: vehicle by plate (optional; staff may not have plate)
    const vehicle = LicensePlate
      ? await Vehicle.findOne({ PlateNumber: LicensePlate }).lean()
      : null

    // Determine subscription early so we can infer VehicleTypeID when needed.
    const subscription = await checkSubscription(CardID)

    // If VehicleTypeID wasn't provided by client (INSTANT case), attempt infer from subscription.
    if (!VehicleTypeID && subscription?.VehicleTypeID) {
      VehicleTypeID = String(subscription.VehicleTypeID).trim()
    }

    // VehicleTypeID is required to create EntrySession. If still missing, ask client to choose it.
    if (!VehicleTypeID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'VehicleTypeID is required (cannot infer from subscription)',
          code: 'VEHICLE_TYPE_REQUIRED'
        }
      })
    }

    const vehicleType = await VehicleType.findOne({ VehicleTypeID }).lean()
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: { message: 'VehicleType not found', code: 'VEHICLE_TYPE_NOT_FOUND' }
      })
    }

    // Visitor card flow: needs subscription decision.
    if (isVisitorCard) {
      if (!subscription) {
        // Treat as customer enters with visitor card.
        const session = new EntrySession({
          VehicleID: null,
          VehicleTypeID,
          CardID,
          LicensePlate: LicensePlate || null,
          ProcessedEntryBy,
          EntryTime: new Date(),
          Status: 'IN_PARKING'
        })

        const saved = await session.save()

        const enriched = await enrichSession(saved)

        return res.status(201).json({
          success: true,
          data: {
            decision: 'VISITOR_NO_SUBSCRIPTION',
            sessionId: saved.ID,
            session: enriched || saved
          }
        })
      }

      // Has subscription: must match vehicle.
      const subscriptionVehicleId = String(subscription.VehicleID || '')
      const inputVehicleId = vehicle ? String(vehicle.VehicleID || '') : ''

      if (subscriptionVehicleId && inputVehicleId && subscriptionVehicleId === inputVehicleId) {
        // Create entry session, VehicleID is nullable but since we have it, include it.
        const session = new EntrySession({
          VehicleID: vehicle.VehicleID,
          VehicleTypeID,
          CardID,
          LicensePlate: LicensePlate || vehicle.PlateNumber || null,
          ProcessedEntryBy,
          EntryTime: new Date(),
          Status: 'IN_PARKING'
        })

        const saved = await session.save()

        const enriched = await enrichSession(saved)

        return res.status(201).json({
          success: true,
          data: {
            decision: 'VISITOR_SUBSCRIPTION_MATCH',
            sessionId: saved.ID,
            session: enriched || saved
          }
        })
      }

      // Subscription exists but doesn't match vehicle (or vehicle unknown) => instruct staff to issue visitor card & re-input.
      return res.status(200).json({
        success: true,
        data: {
          decision: 'VISITOR_SUBSCRIPTION_MISMATCH',
          nextAction: {
            type: 'ISSUE_VISITOR_CARD',
            message: 'Subscription exists but does not match this vehicle. Please issue a Visitor card and re-enter the Visitor Card ID.'
          },
          subscription: {
            VehicleID: subscription.VehicleID,
            VehicleTypeID: subscription.VehicleTypeID,
            StartDate: subscription.StartDate,
            EndDate: subscription.EndDate
          }
        }
      })
    }

    // Non-visitor card: create session with VehicleID nullable (per requirement)
    const session = new EntrySession({
      VehicleID: null,
      VehicleTypeID,
      CardID,
      LicensePlate: LicensePlate || null,
      ProcessedEntryBy,
      EntryTime: new Date(),
      Status: 'IN_PARKING'
    })

    const saved = await session.save()

    const enriched = await enrichSession(saved)

    return res.status(201).json({
      success: true,
      data: {
        decision: 'NON_VISITOR_CREATED',
        sessionId: saved.ID,
        session: enriched || saved
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GATE_ENTRY_ERROR' }
    })
  }
})

// GET single entry session by ID
entrySessionsRouter.get('/:id', async (req, res) => {
  try {
    const session = await EntrySession
      .findById(req.params.id)
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber Color Status',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID ActiveDay ExpireDay',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate({
        path: 'ProcessedExitBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'EntrySession not found',
          code: 'ENTRY_SESSION_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: session
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_ENTRY_SESSION_ERROR'
      }
    })
  }
})

// GET active session by card ID
entrySessionsRouter.get('/active/:cardId', async (req, res) => {
  try {
    const session = await EntrySession
      .findOne({
        CardID: req.params.cardId,
        Status: 'IN_PARKING'
      })
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    if (!session) {
      return res.json({
        success: true,
        data: {
          hasActiveSession: false,
          session: null
        }
      })
    }

    res.json({
      success: true,
      data: {
        hasActiveSession: true,
        session
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_ACTIVE_SESSION_ERROR'
      }
    })
  }
})

// POST - Create entry session (vehicle entry)
entrySessionsRouter.post('/entry', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return
    const {
      VehicleID,
      VehicleTypeID,
      CardID,
      LicensePlate,
      ProcessedEntryBy
    } = req.body

    // Validate required fields
    if (!VehicleTypeID || !CardID || !ProcessedEntryBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'VehicleTypeID, CardID, and ProcessedEntryBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if Vehicle exists (optional)
    if (VehicleID) {
      const vehicle = await Vehicle.findOne({ VehicleID })
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

    // Check if VehicleType exists
    const vehicleType = await VehicleType.findOne({ VehicleTypeID })
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'VehicleType not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      })
    }

    // Check if Card exists and is active
    const card = await Card.findOne({ CardID }).populate('CardCategoryID')
    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    if (!card.IsActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Card is not active',
          code: 'CARD_INACTIVE'
        }
      })
    }

    // Check if card has expired
    if (card.ExpireDay && new Date(card.ExpireDay) < new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Card has expired',
          code: 'CARD_EXPIRED'
        }
      })
    }

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: ProcessedEntryBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    // Check if card already has an active session
    const existingSession = await EntrySession.findOne({
      CardID,
      Status: 'IN_PARKING'
    })

    if (existingSession) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Card already has an active parking session',
          code: 'ACTIVE_SESSION_EXISTS'
        }
      })
    }

    const session = new EntrySession({
      VehicleID: VehicleID || null,
      VehicleTypeID,
      CardID,
      LicensePlate: LicensePlate || null,
      ProcessedEntryBy,
      EntryTime: new Date(),
      Status: 'IN_PARKING'
    })

    const savedSession = await session.save()
    const populatedSession = await EntrySession
      .findById(savedSession._id)
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    res.status(201).json({
      success: true,
      data: populatedSession,
      message: 'Vehicle entry recorded successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_ENTRY_SESSION_ERROR'
      }
    })
  }
})

// POST - Process exit (calculate fee and close session)
entrySessionsRouter.post('/exit/:id', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return
    const { ProcessedExitBy, ManualFee, DiscountReason } = req.body

    const session = await EntrySession
      .findById(req.params.id)
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'EntrySession not found',
          code: 'ENTRY_SESSION_NOT_FOUND'
        }
      })
    }

    if (session.Status !== 'IN_PARKING') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Session is not in parking status',
          code: 'SESSION_NOT_IN_PARKING',
          details: `Current status: ${session.Status}`
        }
      })
    }

    if (!ProcessedExitBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'ProcessedExitBy is required',
          code: 'MISSING_PROCESSED_EXIT_BY'
        }
      })
    }

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: ProcessedExitBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    const exitTime = new Date()

    // Check for valid subscription
    const subscription = await checkSubscription(session.CardID)

    let calculatedFee = 0
    let finalFee = 0
    let discountReason = null

    if (subscription) {
      // Has valid subscription - free parking
      calculatedFee = 0
      finalFee = 0
      discountReason = 'SUBSCRIPTION'
    } else {
      // Calculate fee based on pricing rules
      calculatedFee = await calculateParkingFee(
        session.EntryTime,
        exitTime,
        session.CardID.CardCategoryID.ID,
        session.VehicleTypeID
      )

      // Apply manual fee or discount if provided
      if (ManualFee !== undefined) {
        finalFee = ManualFee
        discountReason = DiscountReason || 'MANUAL_OVERRIDE'
      } else {
        finalFee = calculatedFee
        discountReason = DiscountReason || null
      }
    }

    // Update session
    session.ExitTime = exitTime
    session.ProcessedExitBy = ProcessedExitBy
    session.Status = 'EXITED'
    session.CalculatedFee = calculatedFee
    session.FinalFee = finalFee
    session.DiscountReason = discountReason

    const updatedSession = await session.save()
    const populatedSession = await EntrySession
      .findById(updatedSession._id)
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate({
        path: 'ProcessedExitBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    res.json({
      success: true,
      data: populatedSession,
      message: 'Vehicle exit processed successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'PROCESS_EXIT_ERROR'
      }
    })
  }
})

// PUT - Update session status (for lost ticket, cancellation)
entrySessionsRouter.put('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return
    const { Status } = req.body

    const session = await EntrySession.findById(req.params.id)
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'EntrySession not found',
          code: 'ENTRY_SESSION_NOT_FOUND'
        }
      })
    }

    if (Status !== undefined) {
      const validStatuses = ['IN_PARKING', 'EXITED', 'LOST_TICKET', 'CANCELLED']
      if (!validStatuses.includes(Status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            code: 'INVALID_STATUS'
          }
        })
      }
      session.Status = Status.toUpperCase()
    }

    const updatedSession = await session.save()
    const populatedSession = await EntrySession
      .findById(updatedSession._id)
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate({
        path: 'ProcessedExitBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })

    res.json({
      success: true,
      data: populatedSession,
      message: 'Session updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_ENTRY_SESSION_ERROR'
      }
    })
  }
})

// DELETE - Delete session (only for cancelled sessions)
entrySessionsRouter.delete('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return
    const session = await EntrySession.findById(req.params.id)
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'EntrySession not found',
          code: 'ENTRY_SESSION_NOT_FOUND'
        }
      })
    }

    if (session.Status !== 'CANCELLED') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Only CANCELLED sessions can be deleted',
          code: 'CANNOT_DELETE_SESSION',
          details: `Session status is ${session.Status}`
        }
      })
    }

    await EntrySession.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Session deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_ENTRY_SESSION_ERROR'
      }
    })
  }
})

/**
 * POST /api/entry-sessions/gate/entry-with-plate
 * Entry workflow with License Plate Recognition
 * 
 * Body (multipart/form-data or JSON):
 *  - CardID (required)
 *  - VehicleTypeID (optional, inferred from subscription if not provided)
 *  - ProcessedEntryBy (optional if staff token present)
 *  - image (file upload or base64)
 * 
 * Response includes:
 *  - session: Created entry session
 *  - recognition: { licensePlate, confidence, croppedImage }
 */
entrySessionsRouter.post('/gate/entry-with-plate', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const CardID = String(req.body.CardID || '').trim()
    let VehicleTypeID = String(req.body.VehicleTypeID || '').trim()
    let ProcessedEntryBy = String(req.body.ProcessedEntryBy || '').trim()

    // Auto-fill from staff token
    if (!ProcessedEntryBy) {
      ProcessedEntryBy = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim()
    }

    if (!CardID || !ProcessedEntryBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardID and ProcessedEntryBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Initialize LP client
    const lpClient = getLPClient(config.LP_SERVICE_URL)

    // Check LP service health
    const isHealthy = await lpClient.healthCheck()
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'License Plate Recognition service is unavailable',
          code: 'LP_SERVICE_UNAVAILABLE'
        }
      })
    }

    // Recognize license plate from image
    let recognitionResult = null
    if (req.body.image) {
      // Base64 image from JSON body
      recognitionResult = await lpClient.recognizeFromBase64(req.body.image)
    } else if (req.file) {
      // File upload from multipart form
      recognitionResult = await lpClient.recognizeFromFile(req.file.path)
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Image is required (provide image field or file upload)',
          code: 'IMAGE_REQUIRED'
        }
      })
    }

    if (!recognitionResult.success) {
      return res.status(422).json({
        success: false,
        error: {
          message: `License plate recognition failed: ${recognitionResult.error}`,
          code: 'LP_RECOGNITION_FAILED'
        }
      })
    }

    const LicensePlate = recognitionResult.licensePlate

    // Validate employee
    const employee = await Employee.findOne({ ID: ProcessedEntryBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
      })
    }

    // Check for active session
    const existingSession = await EntrySession.findOne({ CardID, Status: 'IN_PARKING' })
    if (existingSession) {
      return res.status(409).json({
        success: false,
        error: { message: 'Card already has an active parking session', code: 'ACTIVE_SESSION_EXISTS' }
      })
    }

    // Validate card
    const card = await resolveCardByBusinessId(CardID)
    if (!card) {
      return res.status(404).json({
        success: false,
        error: { message: 'Card not found', code: 'CARD_NOT_FOUND' }
      })
    }

    if (card.Status && card.Status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { message: 'Card is not active', code: 'CARD_INACTIVE' }
      })
    }

    if (card.ExpireDay && new Date(card.ExpireDay) < new Date()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Card has expired', code: 'CARD_EXPIRED' }
      })
    }

    // Check subscription to infer VehicleTypeID
    const subscription = await checkSubscription(CardID)
    if (!VehicleTypeID && subscription?.VehicleTypeID) {
      VehicleTypeID = String(subscription.VehicleTypeID).trim()
    }

    if (!VehicleTypeID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'VehicleTypeID is required (cannot infer from subscription)',
          code: 'VEHICLE_TYPE_REQUIRED'
        }
      })
    }

    // Validate vehicle type
    const vehicleType = await VehicleType.findOne({ VehicleTypeID }).lean()
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: { message: 'VehicleType not found', code: 'VEHICLE_TYPE_NOT_FOUND' }
      })
    }

    // Check if vehicle exists by plate
    let vehicle = LicensePlate
      ? await Vehicle.findOne({ PlateNumber: LicensePlate }).lean()
      : null

    // Create entry session with LP recognition data
    const session = new EntrySession({
      VehicleID: vehicle?.VehicleID || null,
      VehicleTypeID,
      CardID,
      LicensePlate: LicensePlate || null,
      EntryImageData: recognitionResult.croppedImage || null, // Save cropped image
      ProcessedEntryBy,
      EntryTime: new Date(),
      Status: 'IN_PARKING'
    })

    const saved = await session.save()

    // Populate for response
    const enriched = await EntrySession.findById(saved._id)
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: { path: 'VehicleTypeID', select: 'VehicleTypeID Name' }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: { path: 'PersonID', select: 'ID FullName' }
      })
      .lean()

    if (enriched?.CardID) {
      const cardData = await resolveCardByBusinessId(enriched.CardID)
      if (cardData) enriched.CardID = cardData
    }

    return res.status(201).json({
      success: true,
      data: {
        session: enriched || saved,
        recognition: {
          licensePlate: recognitionResult.licensePlate,
          confidence: recognitionResult.confidence,
          hasImage: Boolean(recognitionResult.croppedImage)
        }
      },
      message: 'Entry recorded successfully with license plate recognition'
    })

  } catch (error) {
    console.error('Entry with plate error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'ENTRY_WITH_PLATE_ERROR'
      }
    })
  }
})

/**
 * POST /api/entry-sessions/gate/exit-with-plate
 * Exit workflow with License Plate Recognition & Validation
 * 
 * Body (multipart/form-data or JSON):
 *  - sessionId or CardID (required) - to identify the session
 *  - ProcessedExitBy (optional if staff token present)
 *  - image (file upload or base64)
 *  - ManualFee (optional)
 *  - DiscountReason (optional)
 * 
 * Response includes:
 *  - session: Updated exit session with fee
 *  - recognition: { licensePlate, confidence, croppedImage }
 *  - validation: { match, entryPlate, exitPlate }
 */
entrySessionsRouter.post('/gate/exit-with-plate', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const sessionId = req.body.sessionId || req.body.id
    const CardID = req.body.CardID
    let ProcessedExitBy = String(req.body.ProcessedExitBy || '').trim()
    const ManualFee = req.body.ManualFee
    const DiscountReason = req.body.DiscountReason

    // Auto-fill from staff token
    if (!ProcessedExitBy) {
      ProcessedExitBy = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim()
    }

    if (!ProcessedExitBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'ProcessedExitBy is required',
          code: 'MISSING_PROCESSED_EXIT_BY'
        }
      })
    }

    // Find active session
    let session = null
    if (sessionId) {
      session = await EntrySession.findById(sessionId)
        .populate({
          path: 'CardID',
          select: 'CardID UID CardCategoryID',
          populate: { path: 'CardCategoryID', select: 'ID Name' }
        })
    } else if (CardID) {
      session = await EntrySession.findOne({ CardID, Status: 'IN_PARKING' })
        .populate({
          path: 'CardID',
          select: 'CardID UID CardCategoryID',
          populate: { path: 'CardCategoryID', select: 'ID Name' }
        })
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'sessionId or CardID is required',
          code: 'MISSING_SESSION_IDENTIFIER'
        }
      })
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Entry session not found', code: 'SESSION_NOT_FOUND' }
      })
    }

    if (session.Status !== 'IN_PARKING') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Session is not in parking status',
          code: 'SESSION_NOT_IN_PARKING',
          details: `Current status: ${session.Status}`
        }
      })
    }

    // Validate employee
    const employee = await Employee.findOne({ ID: ProcessedExitBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
      })
    }

    // Initialize LP client
    const lpClient = getLPClient(config.LP_SERVICE_URL)

    // Check LP service health
    const isHealthy = await lpClient.healthCheck()
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'License Plate Recognition service is unavailable',
          code: 'LP_SERVICE_UNAVAILABLE'
        }
      })
    }

    // Recognize license plate from image
    let recognitionResult = null
    if (req.body.image) {
      recognitionResult = await lpClient.recognizeFromBase64(req.body.image)
    } else if (req.file) {
      recognitionResult = await lpClient.recognizeFromFile(req.file.path)
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Image is required (provide image field or file upload)',
          code: 'IMAGE_REQUIRED'
        }
      })
    }

    if (!recognitionResult.success) {
      return res.status(422).json({
        success: false,
        error: {
          message: `License plate recognition failed: ${recognitionResult.error}`,
          code: 'LP_RECOGNITION_FAILED'
        }
      })
    }

    const exitPlate = recognitionResult.licensePlate
    const entryPlate = session.LicensePlate

    // Validate plate match (warning only, not blocking)
    const plateMatch = entryPlate && exitPlate
      ? String(entryPlate).trim().toUpperCase() === String(exitPlate).trim().toUpperCase()
      : null

    const exitTime = new Date()

    // Check for valid subscription
    const subscription = await checkSubscription(session.CardID)

    let calculatedFee = 0
    let finalFee = 0
    let discountReason = null

    if (subscription) {
      // Has valid subscription - free parking
      calculatedFee = 0
      finalFee = 0
      discountReason = 'SUBSCRIPTION'
    } else {
      // Calculate fee based on pricing rules
      calculatedFee = await calculateParkingFee(
        session.EntryTime,
        exitTime,
        session.CardID.CardCategoryID.ID || session.CardID.CardCategoryID,
        session.VehicleTypeID
      )

      // Apply manual fee or discount if provided
      if (ManualFee !== undefined) {
        finalFee = ManualFee
        discountReason = DiscountReason || 'MANUAL_OVERRIDE'
      } else {
        finalFee = calculatedFee
        discountReason = DiscountReason || null
      }
    }

    // Update session with exit data
    session.ExitTime = exitTime
    session.ProcessedExitBy = ProcessedExitBy
    session.Status = 'EXITED'
    session.CalculatedFee = calculatedFee
    session.FinalFee = finalFee
    session.DiscountReason = discountReason
    session.ExitImageData = recognitionResult.croppedImage || null // Save cropped exit image

    const updated = await session.save()

    // Populate for response
    const enriched = await EntrySession.findById(updated._id)
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: { path: 'VehicleTypeID', select: 'VehicleTypeID Name' }
      })
      .populate({
        path: 'ProcessedEntryBy',
        select: 'ID EmployeeType',
        populate: { path: 'PersonID', select: 'ID FullName' }
      })
      .populate({
        path: 'ProcessedExitBy',
        select: 'ID EmployeeType',
        populate: { path: 'PersonID', select: 'ID FullName' }
      })
      .lean()

    if (enriched?.CardID) {
      const cardData = await resolveCardByBusinessId(enriched.CardID)
      if (cardData) enriched.CardID = cardData
    }

    return res.json({
      success: true,
      data: {
        session: enriched || updated,
        recognition: {
          licensePlate: recognitionResult.licensePlate,
          confidence: recognitionResult.confidence,
          hasImage: Boolean(recognitionResult.croppedImage)
        },
        validation: {
          plateMatch,
          entryPlate: entryPlate || null,
          exitPlate: exitPlate || null,
          warning: plateMatch === false ? 'License plates do not match' : null
        }
      },
      message: 'Exit processed successfully with license plate recognition'
    })

  } catch (error) {
    console.error('Exit with plate error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'EXIT_WITH_PLATE_ERROR'
      }
    })
  }
})

/**
 * GET /api/entry-sessions/:id/images
 * Get entry and exit images for a session
 * 
 * Response:
 *  - entryImage: base64 data URL or null
 *  - exitImage: base64 data URL or null
 */
entrySessionsRouter.get('/:id/images', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const session = await EntrySession.findById(req.params.id)
      .select('ID EntryImageData ExitImageData LicensePlate EntryTime ExitTime')
      .lean()

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Entry session not found', code: 'SESSION_NOT_FOUND' }
      })
    }

    return res.json({
      success: true,
      data: {
        sessionId: session.ID,
        licensePlate: session.LicensePlate,
        entryImage: session.EntryImageData || null,
        exitImage: session.ExitImageData || null,
        entryTime: session.EntryTime,
        exitTime: session.ExitTime
      }
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_IMAGES_ERROR'
      }
    })
  }
})

module.exports = entrySessionsRouter
