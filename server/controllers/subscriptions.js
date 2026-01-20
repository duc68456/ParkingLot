const subscriptionsRouter = require('express').Router()
const middleware = require('../utils/middleware')
const Subscription = require('../models/subscription')
const Customer = require('../models/customer')
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const SubscriptionType = require('../models/subscriptionType')
const Employee = require('../models/employee')
const Person = require('../models/person')
const CardCategory = require('../models/cardCategory');

const isMongoObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)

// Helper: Attach related docs without using populate (our refs store business IDs, not ObjectIds)
const attachSubscriptionRelations = async (subscriptionDoc) => {
  const obj = subscriptionDoc?.toJSON ? subscriptionDoc.toJSON() : subscriptionDoc
  if (!obj) return obj

  const [employeeRaw, customerRaw, vehicle, vehicleType, cardRaw, subscriptionType] = await Promise.all([
    obj.ProcessedBy ? Employee.findOne({ ID: obj.ProcessedBy }).lean() : null,
    obj.CustomerID ? Customer.findOne({ ID: obj.CustomerID }).lean() : null,
    obj.VehicleID ? Vehicle.findOne({ VehicleID: obj.VehicleID }).lean() : null,
    obj.VehicleTypeID ? VehicleType.findOne({ VehicleTypeID: obj.VehicleTypeID }).lean() : null,
    obj.CardID ? Card.findOne({ CardID: obj.CardID }).lean() : null,
    obj.SubscriptionTypeID ? SubscriptionType.findOne({ ID: obj.SubscriptionTypeID }).lean() : null
  ])

  // Attach Person details (by business ID) so UI can display names.
  const [employeePerson, customerPerson, cardCategory] = await Promise.all([
    employeeRaw?.PersonID ? Person.findOne({ ID: employeeRaw.PersonID }).lean() : null,
    customerRaw?.PersonID ? Person.findOne({ ID: customerRaw.PersonID }).lean() : null,
    cardRaw?.CardCategoryID ? CardCategory.findOne({ ID: cardRaw.CardCategoryID }).lean() : null
  ])

  // if (cardRaw && cardRaw.CardCategoryID) {
  //   // Tìm thông tin Category dựa trên ID lưu trong Card
  //   const category = await CardCategory.findOne({ CardCategoryID: cardRaw.CardCategoryID }).lean();
  //   // Gộp thông tin category vào object card
  //   card = { ...cardRaw, CardCategory: category };
  // }

  const card = cardRaw
    ? { ...cardRaw, CardCategoryID: cardCategory || cardRaw.CardCategoryID }
    : null
  const employee = employeeRaw
    ? { ...employeeRaw, PersonID: employeePerson || employeeRaw.PersonID }
    : null
  const customer = customerRaw
    ? { ...customerRaw, PersonID: customerPerson || customerRaw.PersonID }
    : null

  obj.ProcessedByEmployee = employee
  obj.Customer = customer
  obj.Vehicle = vehicle
  obj.VehicleType = vehicleType
  obj.Card = card
  obj.SubscriptionType = subscriptionType

  return obj
}

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
subscriptionsRouter.get('/', middleware.requirePermissions(['SUBSCRIPTIONS.VIEW']), async (req, res) => {
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

    // Generic search (ID, CardID, Plate, Customer Name)
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' }

      // Resolve Vehicle IDs matching Plate
      const matchingVehicles = await Vehicle.find({ PlateNumber: searchRegex }).select('VehicleID').lean()
      const matchingVehicleIds = matchingVehicles.map(v => v.VehicleID)

      // Resolve Customer IDs matching Name (requires lookup Person -> Customer)
      // For simplicity/perf, let's search ID, CardID, and Vehicle Plate for now.

      const searchConditions = [
        { ID: searchRegex },
        { CardID: searchRegex },
        { VehicleID: { $in: matchingVehicleIds } }
      ]

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }]
        delete filter.$or
      } else {
        filter.$or = searchConditions
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await Subscription.countDocuments(filter)

    const subscriptions = await Subscription
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ProcessedAt: -1 })

    const items = await Promise.all(subscriptions.map((s) => attachSubscriptionRelations(s)))

    res.json({
      success: true,
      data: {
        items,
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
subscriptionsRouter.get('/:id', middleware.requirePermissions(['SUBSCRIPTIONS.VIEW']), async (req, res) => {
  try {
    // Accept either business ID (SSN####) or Mongo ObjectId.
    // IMPORTANT: never query {_id: 'SSN0001'} because Mongoose will try to cast and throw.
    const idParam = req.params.id
    const or = [{ ID: idParam }]
    if (isMongoObjectId(idParam)) or.unshift({ _id: idParam })

    const subscription = await Subscription.findOne({ $or: or })

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
    const subscriptionData = await attachSubscriptionRelations(subscription)
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
subscriptionsRouter.get('/check/:cardId', middleware.requirePermissions(['SUBSCRIPTIONS.VIEW']), async (req, res) => {
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
subscriptionsRouter.post('/', middleware.requirePermissions(['SUBSCRIPTIONS.FULL']), async (req, res) => {
  try {
    const {
      CustomerID,
      VehicleID,
      VehicleTypeID,
      CardID,
      SubscriptionTypeID,
      PricePaid,
      StartDate
    } = req.body

    // Derive ProcessedBy from token user (preferred) and fall back to body for backward compatibility.
    // We store employee references as BUSINESS IDs (e.g., EMP0001) in the Subscription model.
    let ProcessedBy = req.user?.employeeBusinessId || req.body.ProcessedBy

    // Backward-compatible fallback: if token only has mongo employeeId, resolve it to business ID.
    if (!ProcessedBy && req.user?.employeeId && isMongoObjectId(req.user.employeeId)) {
      const emp = await Employee.findById(req.user.employeeId)
      ProcessedBy = emp?.ID || null
    }
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

    // Derive CustomerID from card ownership if not explicitly provided.
    // Card.OwnerID stores the PERSON business ID (Person.ID) when a card is assigned.
    let resolvedCustomerId = CustomerID || null
    if (!resolvedCustomerId) {
      const cardForCustomer = await Card.findOne({ CardID }).select('OwnerID')
      if (cardForCustomer?.OwnerID) {
        const cust = await Customer.findOne({ PersonID: String(cardForCustomer.OwnerID) }).select('ID')
        if (cust?.ID) resolvedCustomerId = cust.ID
      }
    }

    // Validate CustomerID if provided/derived
    if (resolvedCustomerId) {
      const customer = await Customer.findOne({ ID: resolvedCustomerId })
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

    // Check if Card already has a subscription (regardless of status)
    const existingSubscription = await Subscription.findOne({ CardID })
    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Card ${CardID} already has a subscription (${existingSubscription.ID}). Each card can only have one subscription.`,
          code: 'CARD_ALREADY_HAS_SUBSCRIPTION'
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
      CustomerID: resolvedCustomerId,
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

    const hydrated = await attachSubscriptionRelations(savedSubscription)

    res.status(201).json({
      success: true,
      data: hydrated,
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
subscriptionsRouter.put('/:id', middleware.requirePermissions(['SUBSCRIPTIONS.FULL']), async (req, res) => {
  try {
    const { IsSuspended } = req.body

    const idParam = req.params.id
    const subscription = isMongoObjectId(idParam)
      ? await Subscription.findById(idParam)
      : await Subscription.findOne({ ID: idParam })
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
    const hydrated = await attachSubscriptionRelations(updatedSubscription)

    res.json({
      success: true,
      data: hydrated,
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
subscriptionsRouter.delete('/:id', middleware.requirePermissions(['SUBSCRIPTIONS.FULL']), async (req, res) => {
  try {
    // Accept either business ID (SSN####) or Mongo ObjectId.
    // IMPORTANT: never query {_id: 'SSN0001'} because Mongoose will try to cast and throw.
    const idParam = req.params.id
    const or = [{ ID: idParam }]
    if (isMongoObjectId(idParam)) or.unshift({ _id: idParam })

    const subscription = await Subscription.findOne({ $or: or })
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        }
      })
    }

    await Subscription.deleteOne({ _id: subscription._id })

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
