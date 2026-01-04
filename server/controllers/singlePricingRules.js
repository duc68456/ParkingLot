const singlePricingRulesRouter = require('express').Router()
const SinglePricingRule = require('../models/singlePricingRule')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const Employee = require('../models/employee')

// GET all single pricing rules with filtering and pagination
singlePricingRulesRouter.get('/', async (req, res) => {
  try {
    const {
      cardCategoryId,
      vehicleTypeId,
      changedBy,
      fromDate,
      toDate,
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

    if (changedBy) {
      filter.ChangedBy = changedBy
    }

    // Filter by date range
    if (fromDate || toDate) {
      filter.StartDateApply = {}
      if (fromDate) {
        filter.StartDateApply.$gte = new Date(fromDate)
      }
      if (toDate) {
        filter.StartDateApply.$lte = new Date(toDate)
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SinglePricingRule.countDocuments(filter)

    const rules = await SinglePricingRule
      .find(filter)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SinglePricingRulePrev', 'ID DayPrice HourPrice NextHourPrice StartDateApply')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

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
        code: 'GET_SINGLE_PRICING_RULES_ERROR'
      }
    })
  }
})

// GET single pricing rule by ID
singlePricingRulesRouter.get('/:id', async (req, res) => {
  try {
    const rule = await SinglePricingRule
      .findById(req.params.id)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate('SinglePricingRulePrev', 'ID DayPrice HourPrice NextHourPrice StartDateApply Reason')

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SinglePricingRule not found',
          code: 'SINGLE_PRICING_RULE_NOT_FOUND'
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
        code: 'GET_SINGLE_PRICING_RULE_ERROR'
      }
    })
  }
})

// GET current pricing rule for a card category and vehicle type
singlePricingRulesRouter.get('/current/:cardCategoryId/:vehicleTypeId', async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const now = new Date()

    const currentRule = await SinglePricingRule
      .findOne({
        CardCategoryID: cardCategoryId,
        VehicleTypeID: vehicleTypeId,
        StartDateApply: { $lte: now }
      })
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    if (!currentRule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No current pricing rule found for this card category and vehicle type',
          code: 'NO_CURRENT_PRICING_RULE'
        }
      })
    }

    res.json({
      success: true,
      data: currentRule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CURRENT_PRICING_RULE_ERROR'
      }
    })
  }
})

// GET pricing history for card category and vehicle type
singlePricingRulesRouter.get('/history/:cardCategoryId/:vehicleTypeId', async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const { page = 1, limit = 20 } = req.query

    const filter = {
      CardCategoryID: cardCategoryId,
      VehicleTypeID: vehicleTypeId
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SinglePricingRule.countDocuments(filter)

    const history = await SinglePricingRule
      .find(filter)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SinglePricingRulePrev', 'ID DayPrice HourPrice NextHourPrice StartDateApply')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    res.json({
      success: true,
      data: {
        items: history,
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
        code: 'GET_PRICING_HISTORY_ERROR'
      }
    })
  }
})

// POST - Create new single pricing rule (immutable - never update, only insert)
singlePricingRulesRouter.post('/', async (req, res) => {
  try {
    const {
      CardCategoryID,
      VehicleTypeID,
      DayPrice,
      HourPrice,
      NextHourPrice,
      StartDateApply,
      ChangedBy,
      Reason
    } = req.body

    // Validate required fields
    if (!CardCategoryID || !VehicleTypeID || DayPrice === undefined ||
      HourPrice === undefined || NextHourPrice === undefined || !ChangedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID, VehicleTypeID, DayPrice, HourPrice, NextHourPrice, and ChangedBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Validate prices are non-negative
    if (DayPrice < 0 || HourPrice < 0 || NextHourPrice < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Prices must be non-negative',
          code: 'INVALID_PRICE'
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

    // Check if Employee exists
    const employee = await Employee.findOne({ ID: ChangedBy })
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      })
    }

    // Get previous pricing rule (most recent before new start date)
    const startDate = StartDateApply ? new Date(StartDateApply) : new Date()
    const previousRule = await SinglePricingRule
      .findOne({
        CardCategoryID,
        VehicleTypeID,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const rule = new SinglePricingRule({
      CardCategoryID,
      VehicleTypeID,
      DayPrice,
      HourPrice,
      NextHourPrice,
      StartDateApply: startDate,
      ChangedBy,
      Reason: Reason || null,
      SinglePricingRulePrev: previousRule ? previousRule.ID : null
    })

    const savedRule = await rule.save()
    const populatedRule = await SinglePricingRule
      .findById(savedRule._id)
      .populate('CardCategoryID', 'ID Name')
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SinglePricingRulePrev', 'ID DayPrice HourPrice NextHourPrice StartDateApply')

    res.status(201).json({
      success: true,
      data: populatedRule,
      message: 'SinglePricingRule created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_SINGLE_PRICING_RULE_ERROR'
      }
    })
  }
})

// Note: No PUT endpoint - SinglePricingRule is immutable (pricing history pattern)
// To change pricing, create a new SinglePricingRule record with new StartDateApply

// DELETE - Hard delete (only for corrections, not normal operations)
singlePricingRulesRouter.delete('/:id', async (req, res) => {
  try {
    const rule = await SinglePricingRule.findById(req.params.id)
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SinglePricingRule not found',
          code: 'SINGLE_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    // Check if other rules reference this as SinglePricingRulePrev
    const referencingRules = await SinglePricingRule.countDocuments({
      SinglePricingRulePrev: rule.ID
    })

    if (referencingRules > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot delete pricing rule that is referenced in pricing history chain',
          code: 'PRICING_RULE_REFERENCED_IN_HISTORY',
          details: `${referencingRules} pricing rule(s) reference this rule`
        }
      })
    }

    await SinglePricingRule.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'SinglePricingRule deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_SINGLE_PRICING_RULE_ERROR'
      }
    })
  }
})

module.exports = singlePricingRulesRouter
