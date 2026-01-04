const entrySessionsRouter = require('express').Router()
const EntrySession = require('../models/entrySession')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const Employee = require('../models/employee')
const Subscription = require('../models/subscription')
const SinglePricingRule = require('../models/singlePricingRule')

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

// GET all entry sessions with filtering and pagination
entrySessionsRouter.get('/', async (req, res) => {
  try {
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

    const sessions = await EntrySession
      .find(filter)
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber Color',
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
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ EntryTime: -1 })

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
    const {
      VehicleID,
      VehicleTypeID,
      CardID,
      ProcessedEntryBy
    } = req.body

    // Validate required fields
    if (!VehicleID || !VehicleTypeID || !CardID || !ProcessedEntryBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'VehicleID, VehicleTypeID, CardID, and ProcessedEntryBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if Vehicle exists
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
      VehicleID,
      VehicleTypeID,
      CardID,
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

module.exports = entrySessionsRouter
