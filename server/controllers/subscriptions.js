const subscriptionsRouter = require('express').Router()
const Subscription = require('../models/subscription')
const Customer = require('../models/customer')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const SubscriptionType = require('../models/subscriptionType')
const Employee = require('../models/employee')

// Helper function to calculate end date
const calculateEndDate = (startDate, durationDays) => {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationDays)
  return endDate
}

// Helper function to check if subscription is valid
const isSubscriptionValid = (subscription) => {
  const now = new Date()
  return !subscription.IsSuspended &&
    new Date(subscription.StartDate) <= now &&
    new Date(subscription.EndDate) >= now
}

// GET all subscriptions with filtering and pagination
subscriptionsRouter.get('/', async (req, res) => {
  try {
    const {
      customerId,
      vehicleId,
      cardId,
      subscriptionTypeId,
      isSuspended,
      isActive,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (customerId) {
      filter.CustomerID = customerId
    }

    if (vehicleId) {
      filter.VehicleID = vehicleId
    }

    if (cardId) {
      filter.CardID = cardId
    }

    if (subscriptionTypeId) {
      filter.SubscriptionTypeID = subscriptionTypeId
    }

    if (isSuspended !== undefined) {
      filter.IsSuspended = isSuspended === 'true'
    }

    // Filter by active status (not suspended and current date within range)
    if (isActive !== undefined) {
      const now = new Date()
      if (isActive === 'true') {
        filter.IsSuspended = false
        filter.StartDate = { $lte: now }
        filter.EndDate = { $gte: now }
      } else {
        filter.$or = [
          { IsSuspended: true },
          { EndDate: { $lt: now } },
          { StartDate: { $gt: now } }
        ]
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await Subscription.countDocuments(filter)

    const subscriptions = await Subscription
      .find(filter)
      .populate({
        path: 'ProcessedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
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
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ProcessedAt: -1 })

    res.json({
      success: true,
      data: {
        items: subscriptions,
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
        code: 'GET_SUBSCRIPTIONS_ERROR'
      }
    })
  }
})

// GET single subscription by ID
subscriptionsRouter.get('/:id', async (req, res) => {
  try {
    const subscription = await Subscription
      .findById(req.params.id)
      .populate({
        path: 'ProcessedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone Gender'
        }
      })
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
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays Description')

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        }
      })
    }

    // Add computed field for validity
    const subscriptionData = subscription.toJSON()
    subscriptionData.isValid = isSubscriptionValid(subscription)

    res.json({
      success: true,
      data: subscriptionData
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_SUBSCRIPTION_ERROR'
      }
    })
  }
})

// GET - Check if card has valid subscription
subscriptionsRouter.get('/check/:cardId', async (req, res) => {
  try {
    const now = new Date()

    const subscription = await Subscription
      .findOne({
        CardID: req.params.cardId,
        IsSuspended: false,
        StartDate: { $lte: now },
        EndDate: { $gte: now }
      })
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays')
      .populate({
        path: 'VehicleID',
        select: 'VehicleID PlateNumber',
        populate: {
          path: 'VehicleTypeID',
          select: 'VehicleTypeID Name'
        }
      })

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          hasValidSubscription: false,
          subscription: null
        }
      })
    }

    res.json({
      success: true,
      data: {
        hasValidSubscription: true,
        subscription
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'CHECK_SUBSCRIPTION_ERROR'
      }
    })
  }
})

// POST - Create new subscription
subscriptionsRouter.post('/', async (req, res) => {
  try {
    const {
      ProcessedBy,
      CustomerID,
      VehicleID,
      VehicleTypeID,
      CardID,
      SubscriptionTypeID,
      PricePaid,
      StartDate
    } = req.body

    // Validate required fields
    if (!ProcessedBy || !VehicleID || !VehicleTypeID || !CardID || !SubscriptionTypeID || PricePaid === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'ProcessedBy, VehicleID, VehicleTypeID, CardID, SubscriptionTypeID, and PricePaid are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: ProcessedBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    // Validate CustomerID if provided
    if (CustomerID) {
      const customer = await Customer.findOne({ ID: CustomerID })
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Customer not found',
            code: 'CUSTOMER_NOT_FOUND'
          }
        })
      }
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

    // Check if Card exists
    const card = await Card.findOne({ CardID })
    if (!card) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Card not found',
          code: 'CARD_NOT_FOUND'
        }
      })
    }

    // Check if SubscriptionType exists
    const subscriptionType = await SubscriptionType.findOne({ ID: SubscriptionTypeID })
    if (!subscriptionType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionType not found',
          code: 'SUBSCRIPTION_TYPE_NOT_FOUND'
        }
      })
    }

    // Calculate EndDate
    const startDate = StartDate ? new Date(StartDate) : new Date()
    const endDate = calculateEndDate(startDate, subscriptionType.DurationDays)

    const subscription = new Subscription({
      ProcessedBy,
      CustomerID: CustomerID || null,
      VehicleID,
      VehicleTypeID,
      CardID,
      SubscriptionTypeID,
      PricePaid,
      StartDate: startDate,
      EndDate: endDate,
      IsSuspended: false
    })

    const savedSubscription = await subscription.save()
    const populatedSubscription = await Subscription
      .findById(savedSubscription._id)
      .populate({
        path: 'ProcessedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
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
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays')

    res.status(201).json({
      success: true,
      data: populatedSubscription,
      message: 'Subscription created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_SUBSCRIPTION_ERROR'
      }
    })
  }
})

// PUT - Update subscription (suspend/resume)
subscriptionsRouter.put('/:id', async (req, res) => {
  try {
    const { IsSuspended } = req.body

    const subscription = await Subscription.findById(req.params.id)
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        }
      })
    }

    if (IsSuspended !== undefined) {
      subscription.IsSuspended = IsSuspended
    }

    const updatedSubscription = await subscription.save()
    const populatedSubscription = await Subscription
      .findById(updatedSubscription._id)
      .populate({
        path: 'ProcessedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate({
        path: 'CustomerID',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
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
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays')

    res.json({
      success: true,
      data: populatedSubscription,
      message: `Subscription ${IsSuspended ? 'suspended' : 'resumed'} successfully`
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_SUBSCRIPTION_ERROR'
      }
    })
  }
})

// DELETE - Delete subscription
subscriptionsRouter.delete('/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        }
      })
    }

    await Subscription.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_SUBSCRIPTION_ERROR'
      }
    })
  }
})

module.exports = subscriptionsRouter
