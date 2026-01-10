const subscriptionPricingRuleDetailsRouter = require('express').Router()
const SubscriptionPricingRuleDetail = require('../models/subscriptionPricingRuleDetail')
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const Employee = require('../models/employee')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const SubscriptionType = require('../models/subscriptionType')
const Person = require('../models/person')

const looksLikeObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)

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

const attachChangedByEmployee = async (employeeBusinessId) => {
  if (!employeeBusinessId) return null
  const employee = await Employee.findOne({ ID: employeeBusinessId })
  if (!employee) return null
  const e = employee.toJSON ? employee.toJSON() : employee
  const person = e.PersonID ? await Person.findOne({ ID: e.PersonID }) : null
  if (person) e.PersonID = person.toJSON ? person.toJSON() : person
  return e
}

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
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    const ruleIds = [...new Set(details.map((d) => d.SubscriptionPricingRuleID).filter(Boolean))]
    const rules = await SubscriptionPricingRule.find({ ID: { $in: ruleIds } })
    const ruleById = new Map(rules.map((r) => [r.ID, r]))

    const prevIds = [...new Set(details.map((d) => d.SubscriptionPricingRuleDetailPrev).filter(Boolean))]
    const prevDocs = prevIds.length
      ? await SubscriptionPricingRuleDetail.find({ ID: { $in: prevIds } }).select('ID Price StartDateApply Reason')
      : []
    const prevById = new Map(prevDocs.map((p) => [p.ID, p]))

    const employeeIds = [...new Set(details.map((d) => d.ChangedBy).filter(Boolean))]
    const employees = employeeIds.length ? await Employee.find({ ID: { $in: employeeIds } }) : []
    const employeeById = new Map(employees.map((e) => [e.ID, e]))

    const personIds = [...new Set(employees.map((e) => e.PersonID).filter(Boolean))]
    const persons = personIds.length ? await Person.find({ ID: { $in: personIds } }) : []
    const personById = new Map(persons.map((p) => [p.ID, p]))

    const items = await Promise.all(details.map(async (d) => {
      const obj = d.toJSON ? d.toJSON() : d
      const rule = ruleById.get(obj.SubscriptionPricingRuleID) || null
      obj.SubscriptionPricingRule = rule ? await attachRuleRelations(rule) : null
      const empRaw = employeeById.get(obj.ChangedBy)
      if (empRaw) {
        const eobj = empRaw.toJSON ? empRaw.toJSON() : empRaw
        const p = eobj.PersonID ? personById.get(eobj.PersonID) : null
        if (p) eobj.PersonID = p.toJSON ? p.toJSON() : p
        obj.ChangedByEmployee = eobj
      } else {
        obj.ChangedByEmployee = null
      }
      obj.SubscriptionPricingRuleDetailPrev = obj.SubscriptionPricingRuleDetailPrev
        ? (prevById.get(obj.SubscriptionPricingRuleDetailPrev)?.toJSON?.() || prevById.get(obj.SubscriptionPricingRuleDetailPrev) || null)
        : null
      return obj
    }))

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
        code: 'GET_SUBSCRIPTION_PRICING_RULE_DETAILS_ERROR'
      }
    })
  }
})

// GET current price for a subscription pricing rule
subscriptionPricingRuleDetailsRouter.get('/current/:subscriptionPricingRuleId', async (req, res) => {
  try {
    const now = new Date()

    const ruleParam = req.params.subscriptionPricingRuleId
    const rule = looksLikeObjectId(ruleParam)
      ? await SubscriptionPricingRule.findById(ruleParam)
      : await SubscriptionPricingRule.findOne({ ID: ruleParam })

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    const currentPrice = await SubscriptionPricingRuleDetail
      .findOne({
        SubscriptionPricingRuleID: rule.ID,
        StartDateApply: { $lte: now }
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

    const data = currentPrice.toJSON ? currentPrice.toJSON() : currentPrice
    // Attach the resolved rule so UI can still show CardCategory/VehicleType/SubscriptionType.
    data.SubscriptionPricingRule = rule
    // Attach ChangedBy employee without attempting ObjectId populate.
    data.ChangedByEmployee = await Employee.findOne({ ID: data.ChangedBy })

    res.json({
      success: true,
      data
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

    const ruleParam = req.params.subscriptionPricingRuleId
    const rule = looksLikeObjectId(ruleParam)
      ? await SubscriptionPricingRule.findById(ruleParam)
      : await SubscriptionPricingRule.findOne({ ID: ruleParam })

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    const filter = { SubscriptionPricingRuleID: rule.ID }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SubscriptionPricingRuleDetail.countDocuments(filter)

    const history = await SubscriptionPricingRuleDetail
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: -1 })

    // Our schema stores SubscriptionPricingRuleDetailPrev as a BUSINESS ID (string),
    // so Mongoose populate() would try to treat it as an ObjectId and throw.
    // Manually hydrate prev details by ID instead.
    const prevIds = [...new Set(history.map((h) => h.SubscriptionPricingRuleDetailPrev).filter(Boolean))]
    const prevDocs = prevIds.length
      ? await SubscriptionPricingRuleDetail.find({ ID: { $in: prevIds } }).select('ID Price StartDateApply Reason')
      : []
    const prevById = new Map(prevDocs.map((p) => [p.ID, (p.toJSON ? p.toJSON() : p)]))

    const employeeIds = [...new Set(history.map((h) => h.ChangedBy).filter(Boolean))]
    const employees = await Employee.find({ ID: { $in: employeeIds } })
    const employeeById = new Map(employees.map((e) => [e.ID, e]))

    const items = history.map((h) => {
      const obj = h.toJSON ? h.toJSON() : h
      obj.SubscriptionPricingRule = rule
      obj.ChangedByEmployee = employeeById.get(obj.ChangedBy) || null
      obj.SubscriptionPricingRuleDetailPrev = obj.SubscriptionPricingRuleDetailPrev
        ? (prevById.get(obj.SubscriptionPricingRuleDetailPrev) || null)
        : null
      return obj
    })

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
        code: 'GET_SUBSCRIPTION_PRICE_HISTORY_ERROR'
      }
    })
  }
})

// GET single subscription pricing rule detail by ID
subscriptionPricingRuleDetailsRouter.get('/:id', async (req, res) => {
  try {
    const idParam = req.params.id
    const detail = looksLikeObjectId(idParam)
      ? await SubscriptionPricingRuleDetail.findById(idParam)
      : await SubscriptionPricingRuleDetail.findOne({ ID: idParam })

    if (!detail) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRuleDetail not found',
          code: 'SUBSCRIPTION_PRICING_RULE_DETAIL_NOT_FOUND'
        }
      })
    }

    const obj = detail.toJSON ? detail.toJSON() : detail
    const rule = obj.SubscriptionPricingRuleID
      ? await SubscriptionPricingRule.findOne({ ID: obj.SubscriptionPricingRuleID })
      : null
    const prev = obj.SubscriptionPricingRuleDetailPrev
      ? await SubscriptionPricingRuleDetail.findOne({ ID: obj.SubscriptionPricingRuleDetailPrev }).select('ID Price StartDateApply Reason')
      : null

    obj.SubscriptionPricingRule = rule ? await attachRuleRelations(rule) : null
    obj.SubscriptionPricingRuleDetailPrev = prev ? (prev.toJSON ? prev.toJSON() : prev) : null
    obj.ChangedByEmployee = await attachChangedByEmployee(obj.ChangedBy)

    res.json({
      success: true,
      data: obj
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

    // Check if SubscriptionPricingRule exists (accept business ID like SPS0001 or Mongo ObjectId)
    const ruleParam = SubscriptionPricingRuleID
    const subscriptionPricingRule = looksLikeObjectId(ruleParam)
      ? await SubscriptionPricingRule.findById(ruleParam)
      : await SubscriptionPricingRule.findOne({ ID: ruleParam })
    if (!subscriptionPricingRule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'SubscriptionPricingRule not found',
          code: 'SUBSCRIPTION_PRICING_RULE_NOT_FOUND'
        }
      })
    }

    // Normalize to always store business ID in detail
    const ruleBusinessId = subscriptionPricingRule.ID

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
        SubscriptionPricingRuleID: ruleBusinessId,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const detail = new SubscriptionPricingRuleDetail({
      SubscriptionPricingRuleID: ruleBusinessId,
      Price,
      StartDateApply: startDate,
      ChangedBy,
      Reason: Reason || null,
      SubscriptionPricingRuleDetailPrev: previousDetail ? previousDetail.ID : null
    })

    const savedDetail = await detail.save()
    const savedObj = savedDetail.toJSON ? savedDetail.toJSON() : savedDetail
    // Avoid populate casting business IDs to ObjectId; attach related docs explicitly
    savedObj.SubscriptionPricingRule = subscriptionPricingRule
    savedObj.ChangedByEmployee = employee
    savedObj.SubscriptionPricingRuleDetailPrev = previousDetail || null

    res.status(201).json({
      success: true,
      data: savedObj,
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
