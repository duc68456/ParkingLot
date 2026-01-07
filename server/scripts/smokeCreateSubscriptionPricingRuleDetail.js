/*
  Smoke test: create a SubscriptionPricingRuleDetail without providing ID.
  Expected: schema pre-save hook generates an ID like SPD0001.

  Usage (Windows cmd):
    cd server
    node scripts/smokeCreateSubscriptionPricingRuleDetail.js SPS0001 EMP0001

  Args:
    - SubscriptionPricingRuleID (business id, e.g. SPS0001)
    - ChangedBy employee business id (e.g. EMP0001)

  Env:
    MONGODB_URI or MONGO_URI; fallback mongodb://127.0.0.1:27017/parkinglot
*/

require('dotenv').config()
const mongoose = require('mongoose')

const SubscriptionPricingRuleDetail = require('../models/subscriptionPricingRuleDetail')
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const Employee = require('../models/employee')

async function main() {
  const [ruleId, changedBy] = process.argv.slice(2)
  if (!ruleId || !changedBy) {
    console.error('Usage: node scripts/smokeCreateSubscriptionPricingRuleDetail.js <SPS####> <EMP####>')
    process.exitCode = 1
    return
  }

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/parkinglot'

  await mongoose.connect(mongoUri)

  const rule = await SubscriptionPricingRule.findOne({ ID: ruleId })
  if (!rule) throw new Error(`SubscriptionPricingRule not found for ID=${ruleId}`)

  const emp = await Employee.findOne({ ID: changedBy })
  if (!emp) throw new Error(`Employee not found for ID=${changedBy}`)

  const detail = new SubscriptionPricingRuleDetail({
    SubscriptionPricingRuleID: ruleId,
    Price: 123.45,
    ChangedBy: changedBy,
    // StartDateApply omitted intentionally -> should default to now
    Reason: 'smoke test'
  })

  await detail.save()

  console.log('✅ Created detail')
  console.log('Business detail ID:', detail.ID)
  console.log('Mongo _id:', detail._id.toString())

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('❌ Smoke test failed:', err)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exitCode = 1
})
