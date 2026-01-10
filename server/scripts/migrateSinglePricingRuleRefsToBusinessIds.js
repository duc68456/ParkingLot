/*
  One-off migration: normalize SinglePricingRule references to business IDs.

  Problem:
    Some SinglePricingRule records have CardCategoryID / VehicleTypeID / ChangedBy stored as Mongo ObjectId
    strings or even raw buffer objects, while the model is intended to store business IDs.

  This script:
    - For each SinglePricingRule, if a ref looks like an ObjectId, it resolves the target document by _id
      and replaces the field value with the target business ID.

  Usage:
    node scripts/migrateSinglePricingRuleRefsToBusinessIds.js

  Env:
    MONGODB_URI (or DATABASE_URL)
*/

require('dotenv').config()
const mongoose = require('mongoose')

const SinglePricingRule = require('../models/singlePricingRule')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const Employee = require('../models/employee')

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

async function main() {
  const mongoUrl = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!mongoUrl) {
    console.error('Missing env: MONGODB_URI (or DATABASE_URL)')
    process.exit(2)
  }

  await mongoose.connect(mongoUrl)

  const rules = await SinglePricingRule.find({}).lean(false)

  let updated = 0
  for (const rule of rules) {
    const next = {}

    const ccVal = normalizeIdValue(rule.CardCategoryID)
    if (ccVal && isObjectId(ccVal)) {
      const cc = await CardCategory.findById(ccVal, { ID: 1 }).lean()
      if (cc?.ID) next.CardCategoryID = cc.ID
    }

    const vtVal = normalizeIdValue(rule.VehicleTypeID)
    if (vtVal && isObjectId(vtVal)) {
      const vt = await VehicleType.findById(vtVal, { VehicleTypeID: 1 }).lean()
      if (vt?.VehicleTypeID) next.VehicleTypeID = vt.VehicleTypeID
    }

    const empVal = normalizeIdValue(rule.ChangedBy)
    if (empVal && isObjectId(empVal)) {
      const emp = await Employee.findById(empVal, { ID: 1 }).lean()
      if (emp?.ID) next.ChangedBy = emp.ID
    }

    if (Object.keys(next).length) {
      await SinglePricingRule.updateOne({ _id: rule._id }, { $set: next })
      updated += 1
      process.stdout.write('.')
    }
  }

  console.log(`\nUpdated ${updated} rule(s).`)
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('ERROR:', err)
    try { await mongoose.disconnect() } catch { /* ignore */ }
    process.exit(1)
  })
