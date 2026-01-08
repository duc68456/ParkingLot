const subscriptionPricingRulesRouter = require('express').Router()
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const SubscriptionPricingRuleDetail = require('../models/subscriptionPricingRuleDetail')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const SubscriptionType = require('../models/subscriptionType')
const mongoose = require('mongoose')

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const attachRuleRelations = async (ruleDocOrObj) => {
  const rule = ruleDocOrObj?.toJSON ? ruleDocOrObj.toJSON() : ruleDocOrObj
  if (!rule) return rule

  const [cardCategory, vehicleType, subscriptionType] = await Promise.all([
    rule.CardCategoryID ? CardCategory.findOne({ ID: rule.CardCategoryID }).select('ID Name') : null,
    rule.VehicleTypeID ? VehicleType.findOne({ VehicleTypeID: rule.VehicleTypeID }).select('VehicleTypeID Name') : null,
    rule.SubscriptionTypeID ? SubscriptionType.findOne({ ID: rule.SubscriptionTypeID }).select('ID TypeName DurationDays Description') : null
  ])

  return {
    ...rule,
    CardCategory: cardCategory || null,
    VehicleType: vehicleType || null,
    SubscriptionType: subscriptionType || null
  }
}

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
      if (isObjectId(cardCategoryId)) {
        const cc = await CardCategory.findById(cardCategoryId).select('ID')
        if (cc?.ID) filter.CardCategoryID = cc.ID
      } else {
        filter.CardCategoryID = cardCategoryId
      }
    }

    if (vehicleTypeId) {
      if (isObjectId(vehicleTypeId)) {
        const vt = await VehicleType.findById(vehicleTypeId).select('VehicleTypeID')
        if (vt?.VehicleTypeID) filter.VehicleTypeID = vt.VehicleTypeID
      } else {
        filter.VehicleTypeID = vehicleTypeId
      }
    }

    if (subscriptionTypeId) {
      if (isObjectId(subscriptionTypeId)) {
        const st = await SubscriptionType.findById(subscriptionTypeId).select('ID')
        if (st?.ID) filter.SubscriptionTypeID = st.ID
      } else {
        filter.SubscriptionTypeID = subscriptionTypeId
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SubscriptionPricingRule.countDocuments(filter)

    const rules = await SubscriptionPricingRule
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    const hydrated = await Promise.all(rules.map((r) => attachRuleRelations(r)))

    res.json({
      success: true,
      data: {
        items: hydrated,
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
    const idOrBusinessId = req.params.id
    const rule = await SubscriptionPricingRule
      .findOne(mongoose.Types.ObjectId.isValid(idOrBusinessId)
        ? { _id: idOrBusinessId }
        : { ID: idOrBusinessId }
      )

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
      data: await attachRuleRelations(rule)
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

    const cardCategory = isObjectId(cardCategoryId)
      ? await CardCategory.findById(cardCategoryId)
      : await CardCategory.findOne({ ID: cardCategoryId })

    const vehicleType = isObjectId(vehicleTypeId)
      ? await VehicleType.findById(vehicleTypeId)
      : await VehicleType.findOne({ VehicleTypeID: vehicleTypeId })

    const subscriptionType = isObjectId(subscriptionTypeId)
      ? await SubscriptionType.findById(subscriptionTypeId)
      : await SubscriptionType.findOne({ ID: subscriptionTypeId })

    if (!cardCategory || !vehicleType || !subscriptionType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory, VehicleType, or SubscriptionType not found',
          code: 'RELATED_ENTITY_NOT_FOUND'
        }
      })
    }

    const rule = await SubscriptionPricingRule
      .findOne({
        CardCategoryID: cardCategory.ID,
        VehicleTypeID: vehicleType.VehicleTypeID,
        SubscriptionTypeID: subscriptionType.ID
      })

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
      data: await attachRuleRelations(rule)
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
    const cardCategory = isObjectId(CardCategoryID)
      ? await CardCategory.findById(CardCategoryID)
      : await CardCategory.findOne({ ID: CardCategoryID })
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
    const vehicleType = isObjectId(VehicleTypeID)
      ? await VehicleType.findById(VehicleTypeID)
      : await VehicleType.findOne({ VehicleTypeID })
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
    const subscriptionType = isObjectId(SubscriptionTypeID)
      ? await SubscriptionType.findById(SubscriptionTypeID)
      : await SubscriptionType.findOne({ ID: SubscriptionTypeID })
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
      CardCategoryID: cardCategory.ID,
      VehicleTypeID: vehicleType.VehicleTypeID,
      SubscriptionTypeID: subscriptionType.ID
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
      CardCategoryID: cardCategory.ID,
      VehicleTypeID: vehicleType.VehicleTypeID,
      SubscriptionTypeID: subscriptionType.ID
    })

    const savedRule = await rule.save()

    res.status(201).json({
      success: true,
      data: await attachRuleRelations(savedRule),
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
    const idParam = req.params.id
    const looksLikeObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)

    const rule = looksLikeObjectId(idParam)
      ? await SubscriptionPricingRule.findById(idParam)
      : await SubscriptionPricingRule.findOne({ ID: idParam })
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    // Delete dependent pricing details first (they reference the rule by business ID)
    if (rule.ID) {
      await SubscriptionPricingRuleDetail.deleteMany({ SubscriptionPricingRuleID: rule.ID })
    }

    await SubscriptionPricingRule.findByIdAndDelete(rule._id)

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
