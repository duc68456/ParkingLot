/*
  Smoke test: create a SubscriptionPricingRule without providing ID.
  Expected: schema pre-save hook generates ID like SPS0001.

  Usage (Windows cmd):
    cd server
    node scripts/smokeCreateSubscriptionPricingRule.js

  Notes:
  - Uses MONGODB_URI or MONGO_URI env vars if defined.
  - Falls back to mongodb://127.0.0.1:27017/parkinglot
*/

require('dotenv').config()
const mongoose = require('mongoose')

const SubscriptionPricingRule = require('../models/subscriptionPricingRule')

async function main() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/parkinglot'

  await mongoose.connect(mongoUri)

  // NOTE: These IDs must exist (or at least satisfy your code paths) if you have
  // additional validation elsewhere. For the schema itself, they're just strings.
  const rule = new SubscriptionPricingRule({
    CardCategoryID: 'CC0001',
    VehicleTypeID: 'VT0001',
    SubscriptionTypeID: 'ST0001'
  })

  await rule.save()

  console.log('✅ Created rule')
  console.log('Mongo _id:', rule._id.toString())
  console.log('Business ID:', rule.ID)

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
