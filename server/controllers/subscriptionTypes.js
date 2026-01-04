const subscriptionTypesRouter = require('express').Router()
const SubscriptionType = require('../models/subscriptionType')

// GET all subscription types with pagination
subscriptionTypesRouter.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query
    const filter = {}

    if (search) {
      filter.$or = [
        { ID: { $regex: search, $options: 'i' } },
        { TypeName: { $regex: search, $options: 'i' } },
        { Description: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SubscriptionType.countDocuments(filter)

    const subscriptionTypes = await SubscriptionType
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ DurationDays: 1 })

    res.json({
      success: true,
      data: {
        items: subscriptionTypes,
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
        code: 'GET_SUBSCRIPTION_TYPES_ERROR'
      }
    })
  }
})

// GET single subscription type by ID
subscriptionTypesRouter.get('/:id', async (req, res) => {
  try {
    const subscriptionType = await SubscriptionType.findById(req.params.id)

    if (!subscriptionType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionType not found',
          code: 'SUBSCRIPTION_TYPE_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: subscriptionType
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_SUBSCRIPTION_TYPE_ERROR'
      }
    })
  }
})

// POST - Create new subscription type
subscriptionTypesRouter.post('/', async (req, res) => {
  try {
    const { TypeName, DurationDays, Description } = req.body

    // Validate required fields
    if (!TypeName || !DurationDays) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'TypeName and DurationDays are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Validate DurationDays
    if (DurationDays < 1) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'DurationDays must be at least 1',
          code: 'INVALID_DURATION'
        }
      })
    }

    // Check if TypeName already exists
    const existingType = await SubscriptionType.findOne({ TypeName })
    if (existingType) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'SubscriptionType with this name already exists',
          code: 'DUPLICATE_TYPE_NAME'
        }
      })
    }

    const subscriptionType = new SubscriptionType({
      TypeName,
      DurationDays,
      Description: Description || null
    })

    const savedSubscriptionType = await subscriptionType.save()

    res.status(201).json({
      success: true,
      data: savedSubscriptionType,
      message: 'SubscriptionType created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_SUBSCRIPTION_TYPE_ERROR'
      }
    })
  }
})

// PUT - Update subscription type
subscriptionTypesRouter.put('/:id', async (req, res) => {
  try {
    const { TypeName, DurationDays, Description } = req.body

    const subscriptionType = await SubscriptionType.findById(req.params.id)
    if (!subscriptionType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionType not found',
          code: 'SUBSCRIPTION_TYPE_NOT_FOUND'
        }
      })
    }

    // If updating TypeName, check for duplicates
    if (TypeName && TypeName !== subscriptionType.TypeName) {
      const existingType = await SubscriptionType.findOne({
        TypeName,
        _id: { $ne: req.params.id }
      })
      if (existingType) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'SubscriptionType with this name already exists',
            code: 'DUPLICATE_TYPE_NAME'
          }
        })
      }
      subscriptionType.TypeName = TypeName
    }

    if (DurationDays !== undefined) {
      if (DurationDays < 1) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'DurationDays must be at least 1',
            code: 'INVALID_DURATION'
          }
        })
      }
      subscriptionType.DurationDays = DurationDays
    }

    if (Description !== undefined) subscriptionType.Description = Description

    const updatedSubscriptionType = await subscriptionType.save()

    res.json({
      success: true,
      data: updatedSubscriptionType,
      message: 'SubscriptionType updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_SUBSCRIPTION_TYPE_ERROR'
      }
    })
  }
})

// DELETE - Hard delete subscription type
subscriptionTypesRouter.delete('/:id', async (req, res) => {
  try {
    const subscriptionType = await SubscriptionType.findById(req.params.id)
    if (!subscriptionType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionType not found',
          code: 'SUBSCRIPTION_TYPE_NOT_FOUND'
        }
      })
    }

    await SubscriptionType.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'SubscriptionType deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_SUBSCRIPTION_TYPE_ERROR'
      }
    })
  }
})

module.exports = subscriptionTypesRouter
