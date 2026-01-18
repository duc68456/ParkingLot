const entrySessionsRouter = require('express').Router()
const EntrySession = require('../models/entrySession')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Employee = require('../models/employee')
const Person = require('../models/person')
const Subscription = require('../models/subscription')
const SinglePricingRule = require('../models/singlePricingRule')
const Shift = require('../models/shift')
const ShiftReport = require('../models/shiftReport')
const ShiftReportDetail = require('../models/shiftReportDetail')
const GateWarning = require('../models/gateWarning')
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

  // Populate OwnerID with Person data for customer name display
  if (card.OwnerID) {
    const owner = await Person.findOne({ ID: String(card.OwnerID).trim() }).select('ID FullName Phone').lean()
    if (owner) card.OwnerID = owner
  }

  return card
}

const normalizeCategoryName = (name) => String(name || '').trim().toLowerCase()

// Mongoose populate tries to use ObjectId by default. Our refs are business IDs (strings).
// This helper makes VehicleType resolution robust whether legacy ObjectId values exist or not.
const resolveVehicleTypeCompat = async (raw) => {
  if (!raw) return null
  const value = String(raw).trim()
  if (!value) return null

  // Prefer business ID (VTP0001)
  const byBusinessId = await VehicleType.findOne({ VehicleTypeID: value.toUpperCase() })
    .select('VehicleTypeID Name')
    .lean()
  if (byBusinessId) return byBusinessId

  // Fallback: legacy ObjectId stored in string field
  if (value.match(/^[0-9a-fA-F]{24}$/)) {
    const byObjectId = await VehicleType.findById(value).select('VehicleTypeID Name').lean()
    if (byObjectId) return byObjectId
  }

  return null
}

// Card references are business IDs (e.g. CRD0059). Mongoose populate assumes ObjectId by default.
const resolveCardCompat = async (raw) => {
  if (!raw) return null
  const value = String(raw).trim()
  if (!value) return null

  const byBusinessId = await Card.findOne({ CardID: value.toUpperCase() }).lean()
  if (byBusinessId) return byBusinessId

  if (value.match(/^[0-9a-fA-F]{24}$/)) {
    const byObjectId = await Card.findById(value).lean()
    if (byObjectId) return byObjectId
  }

  return null
}

// Employee references are business IDs (e.g. EMP0006). Populate assumes ObjectId by default.
const resolveEmployeeCompat = async (raw) => {
  if (!raw) return null
  const value = String(raw).trim()
  if (!value) return null

  const byBusinessId = await Employee
    .findOne({ ID: value.toUpperCase() })
    .populate({ path: 'PersonID', select: 'ID FullName' })
    .lean()
  if (byBusinessId) return byBusinessId

  if (value.match(/^[0-9a-fA-F]{24}$/)) {
    const byObjectId = await Employee
      .findById(value)
      .populate({ path: 'PersonID', select: 'ID FullName' })
      .lean()
    if (byObjectId) return byObjectId
  }

  return null
}

// Helper: increment shift/report counters for an employee's active shift.
// Returns a small debug payload so entry endpoints can surface whether counters were updated.
const incrementShiftCounters = async (employeeBusinessId, vehicleTypeId, revenue = 0) => {
  const result = {
    ok: false,
    skipped: false,
    reason: null,
    shiftId: null,
    reportId: null,
    vehicleTypeId: vehicleTypeId ? String(vehicleTypeId).toUpperCase() : null
  }

  if (!employeeBusinessId) {
    result.skipped = true
    result.reason = 'MISSING_EMPLOYEE_ID'
    return result
  }

  const empId = String(employeeBusinessId).trim().toUpperCase()
  if (!empId) {
    result.skipped = true
    result.reason = 'EMPTY_EMPLOYEE_ID'
    return result
  }

  // Find latest active shift for this employee
  const shift = await Shift
    .findOne({ EmployeeID: empId, Status: { $in: ['IN_PROGRESS', 'ACTIVE'] } })
    .sort({ CheckInTime: -1 })

  // If no active shift exists, do NOT increment (there's nothing to attribute to).
  // The shift must be created on staff login.
  if (!shift) {
    result.skipped = true
    result.reason = 'NO_ACTIVE_SHIFT'
    return result
  }

  result.shiftId = shift.ID
  const rev = Number(revenue) || 0

  // Increment Shift.TotalVehicles and TotalRevenue
  await Shift.updateOne({ _id: shift._id }, { $inc: { TotalVehicles: 1, TotalRevenue: rev } })

  // Ensure ShiftReport exists and increment its TotalVehicles and TotalRevenue atomically.
  const report = await ShiftReport.findOneAndUpdate(
    { ShiftID: shift.ID },
    {
      $setOnInsert: {
        ShiftID: shift.ID,
        GeneratedAt: new Date()
      },
      $inc: { TotalVehicles: 1, TotalRevenue: rev }
    },
    { new: true, upsert: true }
  )

  result.reportId = report?.ID || null

  // Ensure detail row for vehicle type and increment count
  if (!vehicleTypeId) {
    result.ok = true
    result.reason = 'NO_VEHICLE_TYPE_ID'
    return result
  }

  if (!report?.ID) {
    result.ok = false
    result.reason = 'SHIFT_REPORT_MISSING_BUSINESS_ID'
    return result
  }

  await ShiftReportDetail.findOneAndUpdate(
    { ShiftReportID: report.ID, VehicleTypeID: String(vehicleTypeId).toUpperCase() },
    {
      $setOnInsert: {
        ShiftReportID: report.ID,
        VehicleTypeID: String(vehicleTypeId).toUpperCase(),
      },
      $inc: { Count: 1 }
    },
    { new: true, upsert: true }
  )

  result.ok = true
  return result
}

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

    // General search (CardID or LicensePlate)
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' }
      filter.$or = [
        { CardID: searchRegex },
        { LicensePlate: searchRegex }
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await EntrySession.countDocuments(filter)

    const rawSessions = await EntrySession
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ EntryTime: -1 })
      .lean()

    // Helper to resolve Employee from either EMP ID or STA ID
    const resolveEmployee = async (id) => {
      if (!id) return null
      const idStr = String(id).trim().toUpperCase()

      // If it's a StaffAccount ID (STA...), find the linked Employee
      if (idStr.startsWith('STA')) {
        const StaffAccount = require('../models/staffAccount') // Lazy loa
        const account = await StaffAccount.findOne({ ID: idStr }).select('EmployeeID').lean()
        if (account?.EmployeeID) {
          return Employee.findOne({ ID: account.EmployeeID }).populate('person').lean()
        }
      }

      // Default: Assume it's an Employee ID
      return Employee.findOne({ ID: idStr }).populate('person').lean()
    }

    const hydrateSession = async (s) => {
      const [vt, v, c, pe, px] = await Promise.all([
        s?.VehicleTypeID ? VehicleType.findOne({ VehicleTypeID: String(s.VehicleTypeID) }).select('VehicleTypeID Name').lean() : null,
        s?.VehicleID ? Vehicle.findOne({ VehicleID: String(s.VehicleID) }).select('VehicleID PlateNumber Color VehicleTypeID').lean() : null,
        s?.CardID ? resolveCardByBusinessId(s.CardID) : null,
        s?.ProcessedEntryBy ? resolveEmployee(s.ProcessedEntryBy) : null,
        s?.ProcessedExitBy ? resolveEmployee(s.ProcessedExitBy) : null
      ])

      // Map populated virtual 'person' back to 'PersonID' property for frontend compatibility
      if (pe) {
        if (pe.person) pe.PersonID = pe.person // Move virtual content to expected prop
        s.ProcessedEntryBy = pe
      }
      if (px) {
        if (px.person) px.PersonID = px.person // Move virtual content to expected prop
        s.ProcessedExitBy = px
      }

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

    // Manual lookup for vehicle since VehicleTypeID is string, not ObjectId
    let vehicle = null
    if (licensePlate) {
      vehicle = await Vehicle.findOne({ PlateNumber: licensePlate }).lean()
      if (vehicle?.VehicleTypeID) {
        const vt = await VehicleType.findOne({ VehicleTypeID: String(vehicle.VehicleTypeID) })
          .select('VehicleTypeID Name')
          .lean()
        if (vt) vehicle.VehicleTypeID = vt
      }
    }

    // Manual lookup for active session - avoid populate on VehicleTypeID (it's a string business ID)
    let activeSession = null
    if (cardId) {
      activeSession = await EntrySession.findOne({ CardID: cardId, Status: 'IN_PARKING' }).lean()

      if (activeSession) {
        // Manually resolve VehicleTypeID
        if (activeSession.VehicleTypeID) {
          const vt = await VehicleType.findOne({ VehicleTypeID: String(activeSession.VehicleTypeID) })
            .select('VehicleTypeID Name')
            .lean()
          if (vt) activeSession.VehicleTypeID = vt
        }

        // Manually resolve VehicleID
        if (activeSession.VehicleID) {
          const v = await Vehicle.findOne({ VehicleID: String(activeSession.VehicleID) })
            .select('VehicleID PlateNumber VehicleTypeID')
            .lean()
          if (v) {
            if (v.VehicleTypeID) {
              const vvt = await VehicleType.findOne({ VehicleTypeID: String(v.VehicleTypeID) })
                .select('VehicleTypeID Name')
                .lean()
              if (vvt) v.VehicleTypeID = vvt
            }
            activeSession.VehicleID = v
          }
        }

        // Manually resolve CardID
        if (activeSession.CardID) {
          const c = await Card.findOne({ CardID: String(activeSession.CardID) })
            .select('CardID UID CardCategoryID')
            .lean()
          if (c) {
            if (c.CardCategoryID) {
              const cc = await CardCategory.findOne({ ID: String(c.CardCategoryID) })
                .select('ID Name')
                .lean()
              if (cc) c.CardCategoryID = cc
            }
            activeSession.CardID = c
          }
        }

        // Manually resolve ProcessedEntryBy
        if (activeSession.ProcessedEntryBy) {
          const emp = await Employee.findOne({ ID: String(activeSession.ProcessedEntryBy) }).lean()
          if (emp) {
            const person = emp.PersonID ? await Person.findOne({ ID: String(emp.PersonID) }).select('FullName').lean() : null
            emp.PersonID = person
            activeSession.ProcessedEntryBy = emp
          }
        }
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
      // Avoid populating CardID/VehicleTypeID/ProcessedEntryBy because those store business IDs, not ObjectId.
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber VehicleTypeID'
      })
      .lean()

    if (session) {
      if (session.VehicleTypeID) {
        session.VehicleTypeID = await resolveVehicleTypeCompat(session.VehicleTypeID)
      }
      if (session.VehicleID?.VehicleTypeID) {
        session.VehicleID.VehicleTypeID = await resolveVehicleTypeCompat(session.VehicleID.VehicleTypeID)
      }

      if (session.CardID) {
        session.CardID = await resolveCardCompat(session.CardID)
      }

      if (session?.CardID?.CardCategoryID) {
        const raw = String(session.CardID.CardCategoryID)
        const byIdField = await CardCategory.findOne({ ID: raw }).select('ID Name').lean()
        if (byIdField) {
          session.CardID.CardCategoryID = byIdField
        } else if (raw.match(/^[0-9a-fA-F]{24}$/)) {
          const byObjectId = await CardCategory.findById(raw).select('ID Name').lean()
          if (byObjectId) session.CardID.CardCategoryID = byObjectId
        }
      }

      if (session.ProcessedEntryBy) {
        session.ProcessedEntryBy = await resolveEmployeeCompat(session.ProcessedEntryBy)
      }
    }

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

    // EntrySession stores CardID as business id. Matching on the raw input is correct.
    const existingSession = await EntrySession.findOne({ CardID, Status: 'IN_PARKING' }).lean()
    if (existingSession) {
      // Return warning with session data instead of error - frontend can confirm re-entry
      return res.status(200).json({
        success: true,
        warning: true,
        code: 'ACTIVE_SESSION_EXISTS',
        message: 'Card already has an active parking session. Confirm to update entry time.',
        existingSession: {
          ID: existingSession.ID,
          CardID: existingSession.CardID,
          EntryTime: existingSession.EntryTime,
          VehicleTypeID: existingSession.VehicleTypeID,
          LicensePlate: existingSession.LicensePlate
        }
      })
    }

    const card = await resolveCardByBusinessId(CardID)
    if (!card) {
      return res.status(404).json({
        success: false,
        error: { message: 'Card not found', code: 'CARD_NOT_FOUND' }
      })
    }

    // Card.Status is the current field (replaces IsActive).
    // Allow ACTIVE cards, or auto-activate PENDING_RFID cards (visitor cards being scanned)
    if (card.Status && card.Status !== 'ACTIVE' && card.Status !== 'PENDING_RFID') {
      return res.status(403).json({
        success: false,
        error: { message: 'Card is not active', code: 'CARD_INACTIVE' }
      })
    }

    // Auto-activate PENDING_RFID cards when creating session (completes card scan workflow)
    if (card.Status === 'PENDING_RFID') {
      await Card.updateOne({ CardID }, { Status: 'ACTIVE' })
      card.Status = 'ACTIVE'
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
          Status: 'IN_PARKING',
          DiscountReason: null // No subscription = instant charge
        })

        const saved = await session.save()

        // Update shift/report counters for this staff
        let shiftCounters = null
        try { shiftCounters = await incrementShiftCounters(ProcessedEntryBy, VehicleTypeID) } catch (e) { shiftCounters = { ok: false, skipped: false, reason: e.message } }

        const enriched = await enrichSession(saved)

        return res.status(201).json({
          success: true,
          data: {
            decision: 'VISITOR_NO_SUBSCRIPTION',
            sessionId: saved.ID,
            session: enriched || saved,
            shiftCounters
          }
        })
      }

      // Has subscription: must match vehicle.
      const subscriptionVehicleId = String(subscription.VehicleID || '')
      const inputVehicleId = vehicle ? String(vehicle.VehicleID || '') : ''
      const confirmMismatch = req.body.confirmMismatch === true

      // Mismatch detection: Subscription exists but differs from input vehicle (or input vehicle unknown)
      const isMismatch = subscriptionVehicleId && subscriptionVehicleId !== inputVehicleId

      if (isMismatch && !confirmMismatch) {
        // Return warning requires confirmation
        const subVehicle = await Vehicle.findOne({ VehicleID: subscription.VehicleID }).select('PlateNumber').lean()
        return res.status(200).json({
          success: true,
          data: {
            warning: true,
            code: 'SUBSCRIPTION_PLATE_MISMATCH',
            message: `Registered plate (${subVehicle?.PlateNumber || 'Unknown'}) does not match input plate (${LicensePlate || 'Unknown'}). Confirm entry?`,
            subscription: {
              PlateNumber: subVehicle?.PlateNumber,
              VehicleTypeID: subscription.VehicleTypeID
            }
          }
        })
      }

      if ((subscriptionVehicleId && inputVehicleId && subscriptionVehicleId === inputVehicleId) || (isMismatch && confirmMismatch)) {
        // Create entry session
        // If confirmed mismatch, we use the input vehicle (if exists) or null, and input plate.
        // We still grant SUBSCRIPTION discount as staff confirmed it.
        const session = new EntrySession({
          VehicleID: vehicle?.VehicleID || null,
          VehicleTypeID,
          CardID,
          LicensePlate: LicensePlate || vehicle?.PlateNumber || null,
          ProcessedEntryBy,
          EntryTime: new Date(),
          Status: 'IN_PARKING',
          DiscountReason: 'SUBSCRIPTION' // Has matching subscription
        })

        const saved = await session.save()

        // Update shift/report counters for this staff
        let shiftCounters = null
        try { shiftCounters = await incrementShiftCounters(ProcessedEntryBy, VehicleTypeID) } catch (e) { shiftCounters = { ok: false, skipped: false, reason: e.message } }

        const enriched = await enrichSession(saved)

        // Log warning if it was a confirmed mismatch
        if (isMismatch && confirmMismatch) {
          try {
            const warning = new GateWarning({
              Type: 'SUBSCRIPTION_MISMATCH_ENTRY',
              SessionID: saved.ID,
              CardID,
              GateNumber: 1, // ToDo: dynamic
              Message: `Subscription Mismatch Entry Confirmed. Input: ${LicensePlate}, Registered: ${subscriptionVehicleId}`,
              ProcessedBy: ProcessedEntryBy,
              IsResolved: true // Auto-resolved by confirmation
            })
            await warning.save()
          } catch (e) { console.error('Failed to log mismatch warning', e) }
        }

        return res.status(201).json({
          success: true,
          data: {
            decision: isMismatch ? 'VISITOR_SUBSCRIPTION_MISMATCH_CONFIRMED' : 'VISITOR_SUBSCRIPTION_MATCH',
            sessionId: saved.ID,
            session: enriched || saved,
            shiftCounters
          }
        })
      }

      // Fallback (should not be reached if checks above cover all cases, but good to keep instructions)
      // Note: Logic above handles Mismatch+Unconfirmed (returns warning) and Mismatch+Confirmed (creates session).
      // The only case left is if logic fails? 
      // Actually, standard visitor flow without sub is handled above.

      // If we are here, it means something unexpected or specific fallback?
      // Revert to original visitor card instruction just in case?
      // But we handled mismatch above.

      // Let's keep the return as a failsafe for "Subscription exists but matching failed and not caught?"
      // Ideally code above covers it.

      return res.status(200).json({
        success: false,
        error: { message: 'Unexpected subscription state', code: 'UNKNOWN_STATE' }
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
      Status: 'IN_PARKING',
      DiscountReason: subscription ? 'SUBSCRIPTION' : null // Set based on subscription existence
    })

    const saved = await session.save()

    // Update shift/report counters for this staff
    let shiftCounters = null
    try { shiftCounters = await incrementShiftCounters(ProcessedEntryBy, VehicleTypeID) } catch (e) { shiftCounters = { ok: false, skipped: false, reason: e.message } }

    const enriched = await enrichSession(saved)

    return res.status(201).json({
      success: true,
      data: {
        decision: 'NON_VISITOR_CREATED',
        sessionId: saved.ID,
        session: enriched || saved,
        shiftCounters
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GATE_ENTRY_ERROR' }
    })
  }
})

/**
 * POST /api/entry-sessions/gate/entry/confirm-reentry
 * Confirm re-entry for a card that already has an active session.
 * Updates the existing session's EntryTime and ProcessedEntryBy,
 * and creates a GateWarning record.
 */
entrySessionsRouter.post('/gate/entry/confirm-reentry', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const SessionID = String(req.body.SessionID || '').trim()
    const CardID = String(req.body.CardID || '').trim()
    const GateNumber = parseInt(req.body.GateNumber) || 1
    const LicensePlate = String(req.body.LicensePlate || '').trim()
    let ProcessedEntryBy = String(req.body.ProcessedEntryBy || '').trim()

    if (!ProcessedEntryBy) {
      ProcessedEntryBy = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim()
    }

    if (!SessionID || !CardID || !ProcessedEntryBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'SessionID, CardID, and ProcessedEntryBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Find the existing session
    const existingSession = await EntrySession.findOne({ ID: SessionID, CardID, Status: 'IN_PARKING' })
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: 'Active session not found', code: 'SESSION_NOT_FOUND' }
      })
    }

    const employee = await Employee.findOne({ ID: ProcessedEntryBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
      })
    }

    const originalEntryTime = existingSession.EntryTime
    const newEntryTime = new Date()

    // Update the existing session
    existingSession.EntryTime = newEntryTime
    existingSession.ProcessedEntryBy = ProcessedEntryBy
    await existingSession.save()

    // Helper to format date in requested format: YYYY-MM-DD-HH-mm-ss
    const formatVnDateTime = (date) => {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const seconds = String(d.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`
    }

    // Create a GateWarning record with simplified structure
    const warning = new GateWarning({
      Type: 'ENTRY',
      Message: `Card ${CardID} re-entered with active session (${existingSession.ID}) at Gate ${GateNumber}. ${LicensePlate ? `(Plate: ${LicensePlate}) ` : ''}Entry time updated from ${formatVnDateTime(originalEntryTime)} to ${formatVnDateTime(newEntryTime)}.`,
      Gate: GateNumber,
      ProcessedBy: ProcessedEntryBy
    })
    await warning.save()

    // Enrich session for response - use shared helpers to ensure OwnerID/Customer is populated
    const enrichedSession = await EntrySession.findById(existingSession._id).lean()

    // Enrich VehicleTypeID
    if (enrichedSession?.VehicleTypeID) {
      const vt = await VehicleType.findOne({ VehicleTypeID: String(enrichedSession.VehicleTypeID) })
        .select('VehicleTypeID Name').lean()
      if (vt) enrichedSession.VehicleTypeID = vt
    }

    // Enrich CardID with Owner info using shared helper
    if (enrichedSession?.CardID) {
      const c = await resolveCardByBusinessId(enrichedSession.CardID)
      enrichedSession.CardID = c
    }

    return res.status(200).json({
      success: true,
      message: 'Re-entry confirmed. Entry time updated.',
      data: {
        session: enrichedSession || existingSession,
        warning: {
          ID: warning.ID,
          Type: warning.Type,
          Message: warning.Message
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'CONFIRM_REENTRY_ERROR' }
    })
  }
})

/**
 * POST /gate/exit/force
 * Force exit without active session - logs GateWarning for audit
 * Used when card needs to exit but no session exists
 */
entrySessionsRouter.post('/gate/exit/force', async (req, res) => {
  // Check permission manually since requireAdminOrStaff is not a middleware
  if (!requireAdminOrStaff(req, res)) return

  try {
    const { CardID, GateNumber, LicensePlate, ProcessedBy, Reason } = req.body

    if (!CardID || !GateNumber || !ProcessedBy) {
      return res.status(400).json({
        success: false,
        error: { message: 'CardID, GateNumber, and ProcessedBy are required', code: 'MISSING_REQUIRED_FIELDS' }
      })
    }

    // Helper to format date
    const formatDateTime = (date) => {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const seconds = String(d.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`
    }

    // Create GateWarning record for force exit
    const warning = new GateWarning({
      Type: 'EXIT',
      Message: `Force Exit: Card ${CardID}${LicensePlate ? ` (Plate: ${LicensePlate})` : ''} exited without active session at Gate ${GateNumber}. ${Reason ? `Reason: ${Reason}` : 'No session found.'} Time: ${formatDateTime(new Date())}.`,
      Gate: GateNumber,
      ProcessedBy: ProcessedBy
    })
    await warning.save()

    return res.status(200).json({
      success: true,
      message: 'Force exit logged successfully.',
      data: {
        warning: {
          ID: warning.ID,
          Type: warning.Type,
          Message: warning.Message
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'FORCE_EXIT_ERROR' }
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

    // Check if card holder has active subscription for this vehicle type
    let subscription = null
    if (card.CustomerID) {
      subscription = await checkSubscription(card.CustomerID, VehicleTypeID)
    } else if (card.EmployeeID) {
      subscription = await checkSubscription(card.EmployeeID, VehicleTypeID)
    }

    const session = new EntrySession({
      VehicleID: VehicleID || null,
      VehicleTypeID,
      CardID,
      LicensePlate: LicensePlate || null,
      ProcessedEntryBy,
      EntryTime: new Date(),
      Status: 'IN_PARKING',
      DiscountReason: subscription ? 'SUBSCRIPTION' : null
    })

    const savedSession = await session.save()

    // Update shift/report counters for this staff
    try { await incrementShiftCounters(ProcessedEntryBy, VehicleTypeID) } catch (e) { /* swallow */ }
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

// POST - Process gate exit (for Staff Gate)
entrySessionsRouter.post('/gate/exit', async (req, res) => {
  try {
    let { CardID, ProcessedExitBy, LicensePlate, confirmMismatch } = req.body

    // Auto-fill from staff token if missing or placeholder
    if (!ProcessedExitBy || ProcessedExitBy === 'STAFF') {
      ProcessedExitBy = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim()
    }

    if (!CardID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required field: CardID',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // 1. Find active session (no populate to avoid ObjectId cast issues)
    const session = await EntrySession.findOne({
      CardID: CardID,
      Status: { $in: ['IN_PARKING', 'Active', 'ACTIVE'] }
    })

    // 2. If no session found
    if (!session) {
      return res.status(200).json({
        success: true,
        data: {
          decision: 'NO_SESSION_FOUND',
          message: 'No active session found for this card'
        }
      })
    }

    // 2.5 Check Plate Mismatch
    // Only check if both plates are available
    const sessionPlate = session.LicensePlate ? String(session.LicensePlate).trim().toUpperCase() : ''
    const inputPlate = LicensePlate ? String(LicensePlate).trim().toUpperCase() : ''
    const isMismatch = sessionPlate && inputPlate && sessionPlate !== inputPlate
    const confirmed = confirmMismatch === true

    if (isMismatch && !confirmed) {
      return res.status(200).json({
        success: true,
        data: {
          warning: true,
          code: 'EXIT_PLATE_MISMATCH',
          message: `Entry plate (${sessionPlate}) differs from exit plate (${inputPlate}). Confirm exit?`,
          session: { ID: session.ID, LicensePlate: sessionPlate, EntryTime: session.EntryTime }
        }
      })
    }

    if (isMismatch && confirmed) {
      // Log warning for forced exit mismatch
      try {
        const warning = new GateWarning({
          Type: 'MISMATCH_EXIT',
          SessionID: session.ID,
          CardID,
          GateNumber: 2, // ToDo: dynamic
          Message: `Exit Mismatch Confirmed. In: ${sessionPlate}, Out: ${inputPlate}`,
          ProcessedBy: ProcessedExitBy || 'SYSTEM',
          IsResolved: true
        })
        await warning.save()
      } catch (e) { console.error('Failed to log exit mismatch', e) }
    }

    // 3. Manual lookups for related data
    const VehicleType = require('../models/vehicleType')
    const Card = require('../models/card')
    const CardCategory = require('../models/cardCategory')
    const SinglePricingRule = require('../models/singlePricingRule')
    const SinglePricingRuleDetail = require('../models/singlePricingRuleDetail')

    const vehicleType = await VehicleType.findOne({ VehicleTypeID: session.VehicleTypeID }).lean()
    const card = await Card.findOne({ CardID: session.CardID }).lean()
    let cardCategory = null
    if (card?.CardCategoryID) {
      cardCategory = await CardCategory.findOne({ ID: card.CardCategoryID }).lean()
    }

    // 4. Calculate duration
    const now = new Date()
    const entryTime = new Date(session.EntryTime)
    const durationMs = now - entryTime
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60))) // At least 1 hour

    // 5. Calculate fee based on pricing rules
    let fee = 0
    const isSubscription = session.DiscountReason === 'SUBSCRIPTION' ||
      cardCategory?.Name?.toLowerCase() === 'subscription'

    if (!isSubscription && cardCategory && vehicleType) {
      // Look up pricing rule for this CardCategory + VehicleType
      const pricingRule = await SinglePricingRule.findOne({
        CardCategoryID: cardCategory.ID,
        VehicleTypeID: vehicleType.VehicleTypeID
      }).lean()

      if (pricingRule) {
        // Get the current effective pricing detail
        const pricingDetail = await SinglePricingRuleDetail.findOne({
          SinglePricingRuleID: pricingRule.ID,
          StartDateApply: { $lte: now }
        }).sort({ StartDateApply: -1, createdAt: -1 }).lean()

        if (pricingDetail) {
          // Calculate fee: 1st hour price + (remaining hours * next hour price)
          const firstHourPrice = pricingDetail.HourPrice || 0
          const nextHourPrice = pricingDetail.NextHourPrice || 0

          if (durationHours <= 1) {
            fee = firstHourPrice
          } else {
            fee = firstHourPrice + ((durationHours - 1) * nextHourPrice)
          }
        }
      }
    }

    // 6. Update and close session
    session.ExitTime = now
    session.ProcessedExitBy = ProcessedExitBy || null
    session.Status = 'EXITED'
    session.CalculatedFee = fee
    session.FinalFee = fee

    await session.save()

    // Update shift/report counters for this staff (Exit counts as a vehicle processed)
    try {
      if (ProcessedExitBy && vehicleType?.VehicleTypeID) {
        await incrementShiftCounters(ProcessedExitBy, vehicleType.VehicleTypeID, fee)
      }
    } catch (e) {
      console.error('Failed to increment shift counters on exit', e)
    }

    return res.json({
      success: true,
      data: {
        decision: 'EXIT_PERMITTED',
        session: {
          ...session.toObject(),
          VehicleTypeID: vehicleType || { VehicleTypeID: session.VehicleTypeID, Name: 'Unknown' },
          CardID: {
            CardID: card?.CardID || session.CardID,
            OwnerID: card?.OwnerID ? { FullName: 'Customer' } : null,
            CardCategoryID: cardCategory || null
          }
        },
        duration: {
          hours: Math.floor(durationMs / (1000 * 60 * 60)),
          minutes: Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        },
        fee: fee
      }
    })

  } catch (error) {
    console.error('Gate Exit Error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GATE_EXIT_ERROR'
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
 * POST /api/entry-sessions/gate/recognize-only
 * Recognition ONLY - No session creation
 * Use this to recognize a license plate before filling in other fields
 * 
 * Body (JSON):
 *  - image (base64 with data URL prefix)
 * 
 * Response:
 *  - licensePlate: Recognized plate text
 *  - confidence: Recognition confidence 0-1
 *  - croppedImage: Base64 cropped plate image
 *  - timestamp: Recognition timestamp
 */
entrySessionsRouter.post('/gate/recognize-only', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

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
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Image is required (provide image field as base64)',
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

    return res.status(200).json({
      success: true,
      data: {
        licensePlate: recognitionResult.licensePlate,
        confidence: recognitionResult.confidence,
        croppedImage: recognitionResult.croppedImage || null,
        timestamp: new Date().toISOString()
      },
      message: 'License plate recognized successfully'
    })

  } catch (error) {
    console.error('Recognize only error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'RECOGNIZE_ONLY_ERROR'
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

    // Update shift/report counters for this staff
    try { await incrementShiftCounters(ProcessedEntryBy, VehicleTypeID) } catch (e) { /* swallow */ }

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
          croppedImage: recognitionResult.croppedImage || null, // Return cropped image for frontend display
          timestamp: new Date().toISOString()
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

    // Update shift/report counters for this staff
    try {
      // Need vehicleType value for counters
      let vTypeId = session.VehicleTypeID
      // If populated (object), extract ID
      if (vTypeId && typeof vTypeId === 'object') vTypeId = vTypeId.VehicleTypeID

      if (ProcessedExitBy && vTypeId) {
        await incrementShiftCounters(ProcessedExitBy, vTypeId, finalFee)
      }
    } catch (e) {
      console.error('Failed to increment shift counters on exit-with-plate', e)
    }

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
          croppedImage: recognitionResult.croppedImage || null, // Return cropped image for frontend display
          timestamp: new Date().toISOString()
        },
        validation: {
          match: plateMatch,
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
