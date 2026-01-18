/**
 * Staff Gate Router
 * Provides endpoints specifically for staff gate operations
 * These endpoints bypass adminOnly middleware
 */

const staffGateRouter = require('express').Router()
const Card = require('../models/card')
const CardCategory = require('../models/cardCategory')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Subscription = require('../models/subscription')

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

/**
 * POST /api/staff-gate/create-visitor-card
 * Create a visitor card for gate entry
 * Automatically finds the Visitor category
 */
staffGateRouter.post('/create-visitor-card', async (req, res) => {
  try {
    // Find Visitor category automatically
    const visitorCategory = await CardCategory.findOne({
      $or: [
        { Name: { $regex: /^visitor$/i } },
        { Name: { $regex: /visitor/i } },
        { Name: { $regex: /vãng lai/i } }
      ],
      IsActive: true
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
    // Status: PENDING_RFID indicates card is being "scanned" but not yet fully processed
    const card = new Card({
      CardCategoryID: visitorCategory.ID,
      OwnerID: null, // Visitor cards have no owner
      ActiveDay: new Date(),
      ExpireDay: null,
      UID: null, // UID will be assigned when card is scanned
      Status: 'ACTIVE',
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
    console.error('Create visitor card error:', error)
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_VISITOR_CARD_ERROR'
      }
    })
  }
})

/**
 * GET /api/staff-gate/card/:cardIdOrUid
 * Get card details by CardID or UID for gate operations
 */
staffGateRouter.get('/card/:cardIdOrUid', async (req, res) => {
  try {
    const { cardIdOrUid } = req.params

    // Try to find by CardID first, then by UID
    let card = await Card.findOne({ CardID: cardIdOrUid })
    if (!card) {
      card = await Card.findOne({ UID: cardIdOrUid })
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

    // Get category info
    const category = await CardCategory.findOne({ ID: card.CardCategoryID }).select('ID Name')
    const vehicleInfo = await getVehicleFromSubscription(card.CardID)

    res.json({
      success: true,
      data: {
        ...card.toJSON(),
        CardCategoryID: category || card.CardCategoryID,
        VehicleInfo: vehicleInfo
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

/**
 * PUT /api/staff-gate/card/:cardIdOrUid/assign-uid
 * Assign UID to a card (when card is scanned at gate)
 */
staffGateRouter.put('/card/:cardIdOrUid/assign-uid', async (req, res) => {
  try {
    const { cardIdOrUid } = req.params
    const { uid, scannedBy } = req.body

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'UID is required',
          code: 'UID_REQUIRED'
        }
      })
    }

    // Find card by CardID or UID
    let card = await Card.findOne({ CardID: cardIdOrUid })
    if (!card) {
      card = await Card.findOne({ UID: cardIdOrUid })
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

    // Check if UID is already used by another card
    const existingCard = await Card.findOne({
      UID: uid,
      _id: { $ne: card._id }
    })

    if (existingCard) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'UID is already used by another card',
          code: 'UID_ALREADY_EXISTS'
        }
      })
    }

    // Update card with UID
    card.UID = uid
    card.UIDScannedAt = new Date()
    if (scannedBy) card.UIDScannedBy = scannedBy

    // Activate the card if it was unassigned
    if (card.Status === 'UNASSIGNED') {
      card.Status = 'ACTIVE'
    }

    const updatedCard = await card.save()

    // Hydrate response
    const category = await CardCategory.findOne({ ID: updatedCard.CardCategoryID }).select('ID Name')
    const vehicleInfo = await getVehicleFromSubscription(updatedCard.CardID)

    res.json({
      success: true,
      data: {
        ...updatedCard.toJSON(),
        CardCategoryID: category || updatedCard.CardCategoryID,
        VehicleInfo: vehicleInfo
      },
      message: 'Card UID assigned successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'ASSIGN_UID_ERROR'
      }
    })
  }
})

/**
 * GET /api/staff-gate/shift-report
 * Get entry sessions for current staff's active shift
 */
staffGateRouter.get('/shift-report', async (req, res) => {
  try {
    const employeeId = String(req?.user?.employeeBusinessId || req?.user?.employeeId || '').trim().toUpperCase()
    console.log('Shift report request - employeeId:', employeeId, 'user:', req?.user)

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authenticated as staff', code: 'UNAUTHORIZED' }
      })
    }

    // Find today's active shift for this employee
    const Shift = require('../models/shift')
    const EntrySession = require('../models/entrySession')
    const VehicleType = require('../models/vehicleType')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Query shift with more flexible status check
    const shift = await Shift.findOne({
      EmployeeID: { $regex: new RegExp(`^${employeeId}$`, 'i') },
      ShiftDate: { $gte: today, $lt: tomorrow },
      Status: { $in: ['IN_PROGRESS', 'ACTIVE'] }
    }).lean()

    console.log('Found shift:', shift)

    // Get check-in time for session filtering (use start of today if no shift)
    const sessionStartTime = shift?.CheckInTime || today

    // Get all entry sessions created during this shift (by this staff)
    const sessions = await EntrySession.find({
      ProcessedEntryBy: { $regex: new RegExp(`^${employeeId}$`, 'i') },
      EntryTime: { $gte: sessionStartTime }
    }).sort({ EntryTime: -1 }).lean()

    // Get all vehicle types for stats
    const vehicleTypes = await VehicleType.find({ IsActive: true }).lean()

    console.log('Found sessions:', sessions.length)

    // Calculate stats per vehicle type
    const stats = { total: sessions.length }
    vehicleTypes.forEach(vt => {
      const key = vt.Name.toLowerCase().replace(/\s+/g, '')
      stats[key] = sessions.filter(s => s.VehicleTypeID === vt.VehicleTypeID).length
    })

    // Format sessions for frontend
    const formattedSessions = sessions.map(s => ({
      entryTime: s.EntryTime ? new Date(s.EntryTime).toLocaleTimeString() : '',
      exitTime: s.ExitTime ? new Date(s.ExitTime).toLocaleTimeString() : null,
      licensePlate: s.LicensePlate || '',
      cardId: s.CardID || '',
      vehicleType: vehicleTypes.find(v => v.VehicleTypeID === s.VehicleTypeID)?.Name || s.VehicleTypeID,
      duration: s.ExitTime && s.EntryTime
        ? Math.round((new Date(s.ExitTime) - new Date(s.EntryTime)) / (1000 * 60)) + ' min'
        : null,
      price: s.FinalFee || 0
    }))

    res.json({
      success: true,
      data: {
        shift: shift || null,
        date: shift?.ShiftDate || today,
        stats,
        sessions: formattedSessions
      }
    })
  } catch (error) {
    console.error('Shift report error:', error)
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'SHIFT_REPORT_ERROR' }
    })
  }
})

/**
 * GET /api/staff-gate/parking-capacity
 * Get current parking capacity per vehicle type
 * Default capacity: 100 per type (configurable later)
 */
staffGateRouter.get('/parking-capacity', async (req, res) => {
  try {
    const EntrySession = require('../models/entrySession')
    const VehicleType = require('../models/vehicleType')

    const DEFAULT_CAPACITY = 100

    // Get all active vehicle types
    const vehicleTypes = await VehicleType.find({ IsActive: true }).lean()

    // Count current IN_PARKING sessions per vehicle type
    const capacityData = {}
    let totalCurrent = 0
    let totalCapacity = 0

    for (const vt of vehicleTypes) {
      const current = await EntrySession.countDocuments({
        VehicleTypeID: vt.VehicleTypeID,
        Status: 'IN_PARKING'
      })

      capacityData[vt.VehicleTypeID] = {
        id: vt.VehicleTypeID,
        name: vt.Name,
        current,
        total: DEFAULT_CAPACITY
      }

      totalCurrent += current
      totalCapacity += DEFAULT_CAPACITY
    }

    res.json({
      success: true,
      data: {
        current: totalCurrent,
        total: totalCapacity,
        vehicleTypes: capacityData
      }
    })
  } catch (error) {
    console.error('Parking capacity error:', error)
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'PARKING_CAPACITY_ERROR' }
    })
  }
})

module.exports = staffGateRouter
