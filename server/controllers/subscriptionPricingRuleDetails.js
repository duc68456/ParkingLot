const subscriptionPricingRuleDetailsRouter = require('express').Router()
const SubscriptionPricingRuleDetail = require('../models/subscriptionPricingRuleDetail')
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const Employee = require('../models/employee')

// GET all subscription pricing rule details with filtering and pagination
subscriptionPricingRuleDetailsRouter.get('/', async (req, res) => {
  try {
    const {
      subscriptionPricingRuleId,
      changedBy,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (subscriptionPricingRuleId) {
      filter.SubscriptionPricingRuleID = subscriptionPricingRuleId
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
    const total = await SubscriptionPricingRuleDetail.countDocuments(filter)

    const details = await SubscriptionPricingRuleDetail
      .find(filter)
      .populate({
        path: 'SubscriptionPricingRuleID',
        populate: [
          { path: 'CardCategoryID', select: 'ID Name' },
          { path: 'VehicleTypeID', select: 'VehicleTypeID Name' },
          { path: 'SubscriptionTypeID', select: 'ID TypeName DurationDays' }
        ]
      })
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SubscriptionPricingRuleDetailPrev', 'ID Price StartDateApply')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    res.json({
      success: true,
      data: {
        items: details,
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
        code: 'GET_SUBSCRIPTION_PRICING_RULE_DETAILS_ERROR'
      }
    })
  }
})

// GET single subscription pricing rule detail by ID
subscriptionPricingRuleDetailsRouter.get('/:id', async (req, res) => {
  try {
    const detail = await SubscriptionPricingRuleDetail
      .findById(req.params.id)
      .populate({
        path: 'SubscriptionPricingRuleID',
        populate: [
          { path: 'CardCategoryID', select: 'ID Name' },
          { path: 'VehicleTypeID', select: 'VehicleTypeID Name' },
          { path: 'SubscriptionTypeID', select: 'ID TypeName DurationDays Description' }
        ]
      })
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .populate('SubscriptionPricingRuleDetailPrev', 'ID Price StartDateApply Reason')

    if (!detail) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRuleDetail not found',
          code: 'SUBSCRIPTION_PRICING_RULE_DETAIL_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: detail
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_SUBSCRIPTION_PRICING_RULE_DETAIL_ERROR'
      }
    })
  }
})

// GET current price for a subscription pricing rule
subscriptionPricingRuleDetailsRouter.get('/current/:subscriptionPricingRuleId', async (req, res) => {
  try {
    const now = new Date()

    const currentPrice = await SubscriptionPricingRuleDetail
      .findOne({
        SubscriptionPricingRuleID: req.params.subscriptionPricingRuleId,
        StartDateApply: { $lte: now }
      })
      .populate({
        path: 'SubscriptionPricingRuleID',
        populate: [
          { path: 'CardCategoryID', select: 'ID Name' },
          { path: 'VehicleTypeID', select: 'VehicleTypeID Name' },
          { path: 'SubscriptionTypeID', select: 'ID TypeName DurationDays' }
        ]
      })
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

    if (!currentPrice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No current price found for this subscription pricing rule',
          code: 'NO_CURRENT_PRICE'
        }
      })
    }

    res.json({
      success: true,
      data: currentPrice
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_CURRENT_SUBSCRIPTION_PRICE_ERROR'
      }
    })
  }
})

// GET price history for a subscription pricing rule
subscriptionPricingRuleDetailsRouter.get('/history/:subscriptionPricingRuleId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const filter = { SubscriptionPricingRuleID: req.params.subscriptionPricingRuleId }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SubscriptionPricingRuleDetail.countDocuments(filter)

    const history = await SubscriptionPricingRuleDetail
      .find(filter)
      .populate({
        path: 'SubscriptionPricingRuleID',
        populate: [
          { path: 'CardCategoryID', select: 'ID Name' },
          { path: 'VehicleTypeID', select: 'VehicleTypeID Name' },
          { path: 'SubscriptionTypeID', select: 'ID TypeName DurationDays' }
        ]
      })
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SubscriptionPricingRuleDetailPrev', 'ID Price StartDateApply')
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
        code: 'GET_SUBSCRIPTION_PRICE_HISTORY_ERROR'
      }
    })
  }
})

// POST - Create new subscription pricing rule detail (immutable - never update, only insert)
subscriptionPricingRuleDetailsRouter.post('/', async (req, res) => {
  try {
    const {
      SubscriptionPricingRuleID,
      Price,
      StartDateApply,
      ChangedBy,
      Reason
    } = req.body

    // Validate required fields
    if (!SubscriptionPricingRuleID || Price === undefined || !ChangedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRuleID, Price, and ChangedBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Validate price is non-negative
    if (Price < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Price must be non-negative',
          code: 'INVALID_PRICE'
        }
      })
    }

    // Check if SubscriptionPricingRule exists
    const subscriptionPricingRule = await SubscriptionPricingRule.findOne({ ID: SubscriptionPricingRuleID })
    if (!subscriptionPricingRule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
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

    // Get previous pricing detail (most recent before new start date)
    const startDate = StartDateApply ? new Date(StartDateApply) : new Date()
    const previousDetail = await SubscriptionPricingRuleDetail
      .findOne({
        SubscriptionPricingRuleID,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const detail = new SubscriptionPricingRuleDetail({
      SubscriptionPricingRuleID,
      Price,
      StartDateApply: startDate,
      ChangedBy,
      Reason: Reason || null,
      SubscriptionPricingRuleDetailPrev: previousDetail ? previousDetail.ID : null
    })

    const savedDetail = await detail.save()
    const populatedDetail = await SubscriptionPricingRuleDetail
      .findById(savedDetail._id)
      .populate({
        path: 'SubscriptionPricingRuleID',
        populate: [
          { path: 'CardCategoryID', select: 'ID Name' },
          { path: 'VehicleTypeID', select: 'VehicleTypeID Name' },
          { path: 'SubscriptionTypeID', select: 'ID TypeName DurationDays' }
        ]
      })
      .populate({
        path: 'ChangedBy',
        select: 'ID EmployeeType',
        populate: {
          path: 'PersonID',
          select: 'ID FullName'
        }
      })
      .populate('SubscriptionPricingRuleDetailPrev', 'ID Price StartDateApply')

    res.status(201).json({
      success: true,
      data: populatedDetail,
      message: 'SubscriptionPricingRuleDetail created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_SUBSCRIPTION_PRICING_RULE_DETAIL_ERROR'
      }
    })
  }
})

// Note: No PUT endpoint - SubscriptionPricingRuleDetail is immutable (price history pattern)
// To change price, create a new SubscriptionPricingRuleDetail record with new StartDateApply

// DELETE - Hard delete (only for corrections, not normal operations)
subscriptionPricingRuleDetailsRouter.delete('/:id', async (req, res) => {
  try {
    const detail = await SubscriptionPricingRuleDetail.findById(req.params.id)
    if (!detail) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRuleDetail not found',
          code: 'SUBSCRIPTION_PRICING_RULE_DETAIL_NOT_FOUND'
        }
      })
    }

    // Check if other details reference this as SubscriptionPricingRuleDetailPrev
    const referencingDetails = await SubscriptionPricingRuleDetail.countDocuments({
      SubscriptionPricingRuleDetailPrev: detail.ID
    })

    if (referencingDetails > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot delete pricing detail that is referenced in price history chain',
          code: 'PRICING_DETAIL_REFERENCED_IN_HISTORY',
          details: `${referencingDetails} pricing detail(s) reference this detail`
        }
      })
    }

    await SubscriptionPricingRuleDetail.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'SubscriptionPricingRuleDetail deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_SUBSCRIPTION_PRICING_RULE_DETAIL_ERROR'
      }
    })
  }
})

module.exports = subscriptionPricingRuleDetailsRouter
