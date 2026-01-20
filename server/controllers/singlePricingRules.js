const singlePricingRulesRouter = require('express').Router()

const SinglePricingRule = require('../models/singlePricingRule')
const SinglePricingRuleDetail = require('../models/singlePricingRuleDetail')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const Employee = require('../models/employee')

const middleware = require('../utils/middleware')

const mongoose = require('mongoose')

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const normalizeIdValue = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return value.toString('hex')
    if (value.buffer && Buffer.isBuffer(value.buffer)) return value.buffer.toString('hex')
    if (typeof value.toString === 'function') return value.toString()
  }
  return String(value)
}

const resolveCardCategory = async (cardCategoryIdOrBusinessId) => {
  if (!cardCategoryIdOrBusinessId) return null
  if (isObjectId(cardCategoryIdOrBusinessId)) return CardCategory.findById(cardCategoryIdOrBusinessId)
  return CardCategory.findOne({ ID: cardCategoryIdOrBusinessId })
}

const resolveVehicleType = async (vehicleTypeIdOrBusinessId) => {
  if (!vehicleTypeIdOrBusinessId) return null
  if (isObjectId(vehicleTypeIdOrBusinessId)) return VehicleType.findById(vehicleTypeIdOrBusinessId)
  return VehicleType.findOne({ VehicleTypeID: vehicleTypeIdOrBusinessId })
}

const resolveEmployee = async (employeeIdOrBusinessId) => {
  if (!employeeIdOrBusinessId) return null
  if (isObjectId(employeeIdOrBusinessId)) return Employee.findById(employeeIdOrBusinessId)
  return Employee.findOne({ ID: employeeIdOrBusinessId })
}

const cardCategoryToBusinessId = (cardCategory) => cardCategory?.ID || cardCategory?.id || null
const vehicleTypeToBusinessId = (vehicleType) => vehicleType?.VehicleTypeID || vehicleType?.id || null
const employeeToBusinessId = (employee) => employee?.ID || employee?.id || null

// Enrich SinglePricingRuleDetail(s) with CardCategory/VehicleType/Employee/Person and previous detail.
// No populate.
const enrichSinglePricingRuleDetails = async (details) => {
  const list = Array.isArray(details) ? details : [details]
  if (!list.length) return []

  const masterRuleIds = new Set()
  const prevDetailIds = new Set()

  const employeeBusinessIds = new Set()
  const employeeMongoIds = new Set()

  for (const d of list) {
    if (!d) continue
    if (d.SinglePricingRuleID) masterRuleIds.add(d.SinglePricingRuleID)
    if (d.SinglePricingRuleDetailPrev) prevDetailIds.add(d.SinglePricingRuleDetailPrev)

    const empVal = normalizeIdValue(d.ChangedBy)
    if (!empVal) continue
    if (isObjectId(empVal)) employeeMongoIds.add(empVal)
    else employeeBusinessIds.add(empVal)
  }

  const masters = masterRuleIds.size
    ? await SinglePricingRule.find(
      { ID: { $in: Array.from(masterRuleIds) } },
      { ID: 1, CardCategoryID: 1, VehicleTypeID: 1 }
    ).lean()
    : []

  const cardCategoryBusinessIds = new Set()
  const vehicleTypeBusinessIds = new Set()
  const cardCategoryMongoIds = new Set()
  const vehicleTypeMongoIds = new Set()

  for (const m of masters) {
    const ccVal = normalizeIdValue(m?.CardCategoryID)
    const vtVal = normalizeIdValue(m?.VehicleTypeID)

    if (ccVal) {
      if (isObjectId(ccVal)) cardCategoryMongoIds.add(ccVal)
      else cardCategoryBusinessIds.add(ccVal)
    }
    if (vtVal) {
      if (isObjectId(vtVal)) vehicleTypeMongoIds.add(vtVal)
      else vehicleTypeBusinessIds.add(vtVal)
    }
  }

  const [
    cardCategoriesByBusiness,
    cardCategoriesByMongo,
    vehicleTypesByBusiness,
    vehicleTypesByMongo,
    employeesByBusiness,
    employeesByMongo,
    prevDetails
  ] = await Promise.all([
    cardCategoryBusinessIds.size
      ? CardCategory.find({ ID: { $in: Array.from(cardCategoryBusinessIds) } }, { ID: 1, Name: 1 }).lean()
      : [],
    cardCategoryMongoIds.size
      ? CardCategory.find({ _id: { $in: Array.from(cardCategoryMongoIds) } }, { ID: 1, Name: 1 }).lean()
      : [],
    vehicleTypeBusinessIds.size
      ? VehicleType.find({ VehicleTypeID: { $in: Array.from(vehicleTypeBusinessIds) } }, { VehicleTypeID: 1, Name: 1 }).lean()
      : [],
    vehicleTypeMongoIds.size
      ? VehicleType.find({ _id: { $in: Array.from(vehicleTypeMongoIds) } }, { VehicleTypeID: 1, Name: 1 }).lean()
      : [],
    employeeBusinessIds.size
      ? Employee.find({ ID: { $in: Array.from(employeeBusinessIds) } }, { ID: 1, EmployeeType: 1, PersonID: 1 }).lean()
      : [],
    employeeMongoIds.size
      ? Employee.find({ _id: { $in: Array.from(employeeMongoIds) } }, { ID: 1, EmployeeType: 1, PersonID: 1 }).lean()
      : [],
    prevDetailIds.size
      ? SinglePricingRuleDetail.find(
        { ID: { $in: Array.from(prevDetailIds) } },
        { ID: 1, DayPrice: 1, HourPrice: 1, NextHourPrice: 1, StartDateApply: 1, Reason: 1, ChangedAt: 1, ChangedBy: 1 }
      ).lean()
      : []
  ])

  const employees = [...employeesByBusiness, ...employeesByMongo]

  // Employee.PersonID is stored as Person business ID string (PER0001)
  const personBusinessIds = Array.from(new Set(employees.map((e) => e?.PersonID).filter(Boolean)))
  let persons = []
  if (personBusinessIds.length) {
    const Person = require('../models/person')
    persons = await Person.find({ ID: { $in: personBusinessIds } }, { ID: 1, FullName: 1, Phone: 1 }).lean()
  }

  const byPersonBusinessId = new Map(persons.map((p) => [p.ID, p]))
  const employeesWithPerson = employees.map((e) => ({
    ...e,
    Person: e?.PersonID ? (byPersonBusinessId.get(e.PersonID) || null) : null
  }))

  const byMasterId = new Map(masters.map((m) => [m.ID, m]))
  const byPrevDetailId = new Map(prevDetails.map((p) => [p.ID, p]))

  const byCardCategoryId = new Map([...cardCategoriesByBusiness, ...cardCategoriesByMongo].map((c) => [c.ID, c]))
  const byVehicleTypeId = new Map([...vehicleTypesByBusiness, ...vehicleTypesByMongo].map((v) => [v.VehicleTypeID, v]))
  const byEmployeeId = new Map(employeesWithPerson.map((e) => [e.ID, e]))

  return list.map((detail) => {
    if (!detail) return detail
    const obj = typeof detail.toObject === 'function' ? detail.toObject() : { ...detail }
    const master = obj.SinglePricingRuleID ? byMasterId.get(obj.SinglePricingRuleID) : null

    const ccVal = normalizeIdValue(master?.CardCategoryID)
    const vtVal = normalizeIdValue(master?.VehicleTypeID)
    const empVal = normalizeIdValue(obj.ChangedBy)

    const cardCategory = ccVal && isObjectId(ccVal)
      ? cardCategoriesByMongo.find((c) => c._id?.toString() === ccVal) || null
      : (ccVal ? byCardCategoryId.get(ccVal) : null)

    const vehicleType = vtVal && isObjectId(vtVal)
      ? vehicleTypesByMongo.find((v) => v._id?.toString() === vtVal) || null
      : (vtVal ? byVehicleTypeId.get(vtVal) : null)

    const employee = empVal && isObjectId(empVal)
      ? employeesByMongo.find((e) => e._id?.toString() === empVal) || null
      : (empVal ? byEmployeeId.get(empVal) : null)

    return {
      ...obj,
      // Provide these for backwards compatibility with existing client mapping
      CardCategoryID: cardCategory ? cardCategory.ID : ccVal,
      VehicleTypeID: vehicleType ? vehicleType.VehicleTypeID : vtVal,
      ChangedBy: employee ? employee.ID : empVal,

      CardCategory: cardCategory,
      VehicleType: vehicleType,
      ChangedByEmployee: employee,
      SinglePricingRule: master,
      SinglePricingRuleDetailPrevRule: obj.SinglePricingRuleDetailPrev
        ? (byPrevDetailId.get(obj.SinglePricingRuleDetailPrev) || null)
        : null
    }
  })
}

// GET list: newest detail per (CardCategoryID, VehicleTypeID)
singlePricingRulesRouter.get('/', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
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

    const masterFilter = {}
    const detailBaseFilter = {}

    if (cardCategoryId) {
      if (isObjectId(cardCategoryId)) {
        const cc = await resolveCardCategory(cardCategoryId)
        const ccBusinessId = cardCategoryToBusinessId(cc)
        if (!ccBusinessId) {
          return res.json({ success: true, data: { items: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } } })
        }
        masterFilter.CardCategoryID = ccBusinessId
      } else {
        masterFilter.CardCategoryID = cardCategoryId
      }
    }

    if (vehicleTypeId) {
      if (isObjectId(vehicleTypeId)) {
        const vt = await resolveVehicleType(vehicleTypeId)
        const vtBusinessId = vehicleTypeToBusinessId(vt)
        if (!vtBusinessId) {
          return res.json({ success: true, data: { items: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } } })
        }
        masterFilter.VehicleTypeID = vtBusinessId
      } else {
        masterFilter.VehicleTypeID = vehicleTypeId
      }
    }

    if (changedBy) {
      if (isObjectId(changedBy)) {
        const emp = await resolveEmployee(changedBy)
        const empBusinessId = employeeToBusinessId(emp)
        if (!empBusinessId) {
          return res.json({ success: true, data: { items: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } } })
        }
        detailBaseFilter.ChangedBy = empBusinessId
      } else {
        detailBaseFilter.ChangedBy = changedBy
      }
    }

    if (fromDate || toDate) {
      detailBaseFilter.StartDateApply = {}
      if (fromDate) detailBaseFilter.StartDateApply.$gte = new Date(fromDate)
      if (toDate) detailBaseFilter.StartDateApply.$lte = new Date(toDate)
    }

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, parseInt(limit))
    const skip = (pageNum - 1) * limitNum

    const masters = await SinglePricingRule
      .find(masterFilter, { ID: 1, CardCategoryID: 1, VehicleTypeID: 1 })
      .lean()

    const total = masters.length
    const pagedMasters = masters
      .slice()
      .sort((a, b) => `${a.CardCategoryID}::${a.VehicleTypeID}`.localeCompare(`${b.CardCategoryID}::${b.VehicleTypeID}`))
      .slice(skip, skip + limitNum)

    const newestDetails = await Promise.all(
      pagedMasters.map(async (m) => {
        // Return newest detail for that master.
        // Apply detail filters only if provided.
        return SinglePricingRuleDetail
          .findOne({ SinglePricingRuleID: m.ID, ...detailBaseFilter })
          .sort({ StartDateApply: -1, createdAt: -1, _id: -1 })
      })
    )

    const details = newestDetails.filter(Boolean)
    const enriched = await enrichSinglePricingRuleDetails(details)

    res.json({
      success: true,
      data: {
        items: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
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

// GET current: effective detail for a pair
singlePricingRulesRouter.get('/current/:cardCategoryId/:vehicleTypeId', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const now = new Date()

    const cardCategory = await resolveCardCategory(cardCategoryId)
    if (!cardCategory) {
      return res.status(404).json({ success: false, error: { message: 'CardCategory not found', code: 'CARD_CATEGORY_NOT_FOUND' } })
    }
    const vehicleType = await resolveVehicleType(vehicleTypeId)
    if (!vehicleType) {
      return res.status(404).json({ success: false, error: { message: 'VehicleType not found', code: 'VEHICLE_TYPE_NOT_FOUND' } })
    }

    const cardCategoryBusinessId = cardCategoryToBusinessId(cardCategory)
    const vehicleTypeBusinessId = vehicleTypeToBusinessId(vehicleType)

    const master = await SinglePricingRule.findOne({
      CardCategoryID: cardCategoryBusinessId,
      VehicleTypeID: vehicleTypeBusinessId
    })

    if (!master) {
      return res.status(404).json({
        success: false,
        error: { message: 'No pricing rule found for this card category and vehicle type', code: 'NO_PRICING_RULE' }
      })
    }

    const currentDetail = await SinglePricingRuleDetail
      .findOne({ SinglePricingRuleID: master.ID, StartDateApply: { $lte: now } })
      .sort({ StartDateApply: -1, createdAt: -1, _id: -1 })

    if (!currentDetail) {
      return res.status(404).json({
        success: false,
        error: { message: 'No current pricing rule found for this card category and vehicle type', code: 'NO_CURRENT_PRICING_RULE' }
      })
    }

    res.json({ success: true, data: (await enrichSinglePricingRuleDetails(currentDetail))[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'GET_CURRENT_PRICING_RULE_ERROR' } })
  }
})

// GET history: all details for a pair (oldest -> newest)
singlePricingRulesRouter.get('/history/:cardCategoryId/:vehicleTypeId', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const { page = 1, limit = 20 } = req.query

    const cardCategory = await resolveCardCategory(cardCategoryId)
    if (!cardCategory) {
      return res.status(404).json({ success: false, error: { message: 'CardCategory not found', code: 'CARD_CATEGORY_NOT_FOUND' } })
    }
    const vehicleType = await resolveVehicleType(vehicleTypeId)
    if (!vehicleType) {
      return res.status(404).json({ success: false, error: { message: 'VehicleType not found', code: 'VEHICLE_TYPE_NOT_FOUND' } })
    }

    const cardCategoryBusinessId = cardCategoryToBusinessId(cardCategory)
    const vehicleTypeBusinessId = vehicleTypeToBusinessId(vehicleType)

    const master = await SinglePricingRule.findOne({
      CardCategoryID: cardCategoryBusinessId,
      VehicleTypeID: vehicleTypeBusinessId
    })

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, parseInt(limit))
    const skip = (pageNum - 1) * limitNum

    if (!master) {
      return res.json({
        success: true,
        data: { items: [], pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 } }
      })
    }

    const filter = { SinglePricingRuleID: master.ID }
    const total = await SinglePricingRuleDetail.countDocuments(filter)
    const history = await SinglePricingRuleDetail
      .find(filter)
      .limit(limitNum)
      .skip(skip)
      .sort({ StartDateApply: 1, createdAt: 1, _id: 1 })

    res.json({
      success: true,
      data: {
        items: await enrichSinglePricingRuleDetails(history),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'GET_PRICING_HISTORY_ERROR' } })
  }
})

// POST: Create a new pricing detail (master is created if missing)
singlePricingRulesRouter.post('/', middleware.requirePermissions(['PRICING.FULL']), async (req, res) => {
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

    if (!CardCategoryID || !VehicleTypeID || DayPrice === undefined || HourPrice === undefined || NextHourPrice === undefined || !ChangedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CardCategoryID, VehicleTypeID, DayPrice, HourPrice, NextHourPrice, and ChangedBy are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    if (DayPrice < 0 || HourPrice < 0 || NextHourPrice < 0) {
      return res.status(400).json({ success: false, error: { message: 'Prices must be non-negative', code: 'INVALID_PRICE' } })
    }

    const cardCategory = await resolveCardCategory(CardCategoryID)
    if (!cardCategory) {
      return res.status(404).json({ success: false, error: { message: 'CardCategory not found', code: 'CARD_CATEGORY_NOT_FOUND' } })
    }

    const vehicleType = await resolveVehicleType(VehicleTypeID)
    if (!vehicleType) {
      return res.status(404).json({ success: false, error: { message: 'VehicleType not found', code: 'VEHICLE_TYPE_NOT_FOUND' } })
    }

    const employee = await resolveEmployee(ChangedBy)
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' } })
    }

    const cardCategoryBusinessId = cardCategoryToBusinessId(cardCategory)
    const vehicleTypeBusinessId = vehicleTypeToBusinessId(vehicleType)
    const employeeBusinessId = employeeToBusinessId(employee)

    let master = await SinglePricingRule.findOne({
      CardCategoryID: cardCategoryBusinessId,
      VehicleTypeID: vehicleTypeBusinessId
    })
    if (!master) {
      master = new SinglePricingRule({
        CardCategoryID: cardCategoryBusinessId,
        VehicleTypeID: vehicleTypeBusinessId
      })
      await master.save()
    }

    const startDate = StartDateApply ? new Date(StartDateApply) : new Date()
    const prevDetail = await SinglePricingRuleDetail
      .findOne({ SinglePricingRuleID: master.ID, StartDateApply: { $lt: startDate } })
      .sort({ StartDateApply: -1, createdAt: -1, _id: -1 })

    const detail = new SinglePricingRuleDetail({
      SinglePricingRuleDetailPrev: prevDetail ? prevDetail.ID : null,
      SinglePricingRuleID: master.ID,
      DayPrice,
      HourPrice,
      NextHourPrice,
      StartDateApply: startDate,
      ChangedBy: employeeBusinessId,
      Reason: Reason || null
    })

    const saved = await detail.save()
    const loaded = await SinglePricingRuleDetail.findById(saved._id)

    res.status(201).json({
      success: true,
      data: (await enrichSinglePricingRuleDetails(loaded))[0],
      message: 'SinglePricingRuleDetail created successfully'
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

// DELETE detail by Mongo _id (correction use only)
singlePricingRulesRouter.delete('/:id', middleware.requirePermissions(['PRICING.FULL']), async (req, res) => {
  try {
    const detail = await SinglePricingRuleDetail.findById(req.params.id)
    if (!detail) {
      return res.status(404).json({ success: false, error: { message: 'SinglePricingRuleDetail not found', code: 'SINGLE_PRICING_RULE_NOT_FOUND' } })
    }

    const referencing = await SinglePricingRuleDetail.countDocuments({ SinglePricingRuleDetailPrev: detail.ID })
    if (referencing > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot delete pricing detail referenced in history chain',
          code: 'PRICING_RULE_REFERENCED_IN_HISTORY',
          details: `${referencing} pricing detail(s) reference this detail`
        }
      })
    }

    await SinglePricingRuleDetail.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'SinglePricingRuleDetail deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'DELETE_SINGLE_PRICING_RULE_ERROR' } })
  }
})

module.exports = singlePricingRulesRouter

// GET single pricing rule by ID
singlePricingRulesRouter.get('/:id', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
  try {
    const { id } = req.params

    // Support both Mongo _id and business ID (e.g. SPR0001)
    const query = isObjectId(id) ? { _id: id } : { ID: id }

    const rule = await SinglePricingRule
      .findOne(query)

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
      data: (await enrichSinglePricingRules(rule))[0]
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
singlePricingRulesRouter.get('/current/:cardCategoryId/:vehicleTypeId', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const now = new Date()

    const cardCategory = await resolveCardCategory(cardCategoryId)
    if (!cardCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      })
    }

    const vehicleType = await resolveVehicleType(vehicleTypeId)
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'VehicleType not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      })
    }

    const cardCategoryBusinessId = cardCategoryToBusinessId(cardCategory)
    const vehicleTypeBusinessId = vehicleTypeToBusinessId(vehicleType)

    const currentRule = await SinglePricingRule
      .findOne({
        CardCategoryID: cardCategoryBusinessId,
        VehicleTypeID: vehicleTypeBusinessId,
        StartDateApply: { $lte: now }
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
      data: (await enrichSinglePricingRules(currentRule))[0]
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
singlePricingRulesRouter.get('/history/:cardCategoryId/:vehicleTypeId', middleware.requirePermissions(['PRICING.VIEW']), async (req, res) => {
  try {
    const { cardCategoryId, vehicleTypeId } = req.params
    const { page = 1, limit = 20 } = req.query

    const cardCategory = await resolveCardCategory(cardCategoryId)
    if (!cardCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      })
    }

    const vehicleType = await resolveVehicleType(vehicleTypeId)
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'VehicleType not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      })
    }

    const cardCategoryBusinessId = cardCategoryToBusinessId(cardCategory)
    const vehicleTypeBusinessId = vehicleTypeToBusinessId(vehicleType)

    const filter = {
      CardCategoryID: cardCategoryBusinessId,
      VehicleTypeID: vehicleTypeBusinessId
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await SinglePricingRule.countDocuments(filter)

    // For history display, the UI should see the true progression of price changes.
    // Return oldest -> newest by effective date.
    const history = await SinglePricingRule
      .find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ StartDateApply: 1, createdAt: 1, _id: 1 })

    const enrichedHistory = await enrichSinglePricingRules(history)

    res.json({
      success: true,
      data: {
        items: enrichedHistory,
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
singlePricingRulesRouter.post('/', middleware.requirePermissions(['PRICING.FULL']), async (req, res) => {
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

    // Resolve referenced entities (accept either Mongo _id or business IDs)
    const cardCategory = await resolveCardCategory(CardCategoryID)
    if (!cardCategory) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'CardCategory not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      })
    }

    const vehicleType = await resolveVehicleType(VehicleTypeID)
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'VehicleType not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      })
    }

    const employee = await resolveEmployee(ChangedBy)
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
        CardCategoryID: cardCategory.ID,
        VehicleTypeID: vehicleType.VehicleTypeID,
        StartDateApply: { $lt: startDate }
      })
      .sort({ StartDateApply: -1 })
      .limit(1)

    const rule = new SinglePricingRule({
      CardCategoryID: cardCategory.ID,
      VehicleTypeID: vehicleType.VehicleTypeID,
      DayPrice,
      HourPrice,
      NextHourPrice,
      StartDateApply: startDate,
      ChangedBy: employee.ID,
      Reason: Reason || null,
      SinglePricingRulePrev: previousRule ? previousRule.ID : null
    })

    const savedRule = await rule.save()
    const loadedRule = await SinglePricingRule.findById(savedRule._id)
    const enrichedRule = (await enrichSinglePricingRules(loadedRule))[0]

    res.status(201).json({
      success: true,
      data: enrichedRule,
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
singlePricingRulesRouter.delete('/:id', middleware.requirePermissions(['PRICING.FULL']), async (req, res) => {
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
