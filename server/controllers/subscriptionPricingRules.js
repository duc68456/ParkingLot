const subscriptionPricingRulesRouter = require('express').Router()
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const SubscriptionType = require('../models/subscriptionType')

// GET all subscription pricing rules with filtering and pagination
subscriptionPricingRulesRouter.get('/', async (req, res) => {
  try {
    const {
      cardCategoryId,
      vehicleTypeId,
      subscriptionTypeId,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (cardCategoryId) {
      filter.CardCategoryID = cardCategoryId
    }

    if (vehicleTypeId) {
      filter.VehicleTypeID = vehicleTypeId
    }

    if (subscriptionTypeId) {
      filter.SubscriptionTypeID = subscriptionTypeId
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SubscriptionPricingRule.countDocuments(filter)

    const rules = await SubscriptionPricingRule
      .find(filter)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        items: rules,
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
        code: 'GET_SUBSCRIPTION_PRICING_RULES_ERROR'
      }
    })
  }
})

// GET single subscription pricing rule by ID
subscriptionPricingRulesRouter.get('/:id', async (req, res) => {
  try {
    const rule = await SubscriptionPricingRule
      .findById(req.params.id)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays Description')

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: rule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_SUBSCRIPTION_PRICING_RULE_ERROR'
      }
    })
  }
})

// GET subscription pricing rule by composite key
subscriptionPricingRulesRouter.get('/find/:cardCategoryId/:vehicleTypeId/:subscriptionTypeId', async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId, subscriptionTypeId } = req.params

    const rule = await SubscriptionPricingRule
      .findOne({
        CardCategoryID: cardCategoryId,
        VehicleTypeID: vehicleTypeId,
        SubscriptionTypeID: subscriptionTypeId
      })
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays Description')

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found for this combination',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: rule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'FIND_SUBSCRIPTION_PRICING_RULE_ERROR'
      }
    })
  }
})

// POST - Create new subscription pricing rule
subscriptionPricingRulesRouter.post('/', async (req, res) => {
  try {
    const { CardCategoryID, VehicleTypeID, SubscriptionTypeID } = req.body

    // Validate required fields
    if (!CardCategoryID || !VehicleTypeID || !SubscriptionTypeID) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID, VehicleTypeID, and SubscriptionTypeID are required',
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

    // Check if combination already exists
    const existingRule = await SubscriptionPricingRule.findOne({
      CardCategoryID,
      VehicleTypeID,
      SubscriptionTypeID
    })

    if (existingRule) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule with this combination already exists',
          code: 'DUPLICATE_SUBSCRIPTION_PRICING_RULE'
        }
      })
    }

    const rule = new SubscriptionPricingRule({
      CardCategoryID,
      VehicleTypeID,
      SubscriptionTypeID
    })

    const savedRule = await rule.save()
    const populatedRule = await SubscriptionPricingRule
      .findById(savedRule._id)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate('SubscriptionTypeID', 'ID TypeName DurationDays Description')

    res.status(201).json({
      success: true,
      data: populatedRule,
      message: 'SubscriptionPricingRule created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_SUBSCRIPTION_PRICING_RULE_ERROR'
      }
    })
  }
})

// Note: No PUT endpoint - SubscriptionPricingRule is immutable (container for pricing details)
// Prices are managed through SubscriptionPricingRuleDetail

// DELETE - Hard delete subscription pricing rule
subscriptionPricingRulesRouter.delete('/:id', async (req, res) => {
  try {
    const rule = await SubscriptionPricingRule.findById(req.params.id)
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    await SubscriptionPricingRule.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'SubscriptionPricingRule deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_SUBSCRIPTION_PRICING_RULE_ERROR'
      }
    })
  }
})

module.exports = subscriptionPricingRulesRouter
