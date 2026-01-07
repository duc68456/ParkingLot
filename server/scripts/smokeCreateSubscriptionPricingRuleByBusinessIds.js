/*
  Smoke test: create SubscriptionPricingRule using BUSINESS IDs:
    - CardCategoryID: CardCategory.ID (e.g., CCG0006)
    - VehicleTypeID: VehicleType.VehicleTypeID (e.g., VT0001)
    - SubscriptionTypeID: SubscriptionType.ID (e.g., ST0001)

  This validates controller logic resolves business IDs -> ObjectIds correctly.

  Usage (Windows cmd):
    cd server
    node scripts/smokeCreateSubscriptionPricingRuleByBusinessIds.js CCG0006 VT0001 ST0001

  Env:
    MONGODB_URI or MONGO_URI; fallback mongodb://127.0.0.1:27017/parkinglot
*/

require('dotenv').config()
const mongoose = require('mongoose')

const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const SubscriptionType = require('../models/subscriptionType')
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')

async function main() {
  const [ccg, vtId, stId] = process.argv.slice(2)
  if (!ccg || !vtId || !stId) {
    console.error('Usage: node scripts/smokeCreateSubscriptionPricingRuleByBusinessIds.js <CCG####> <VT####> <ST####>')
    process.exitCode = 1
    return
  }

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/parkinglot'

  await mongoose.connect(mongoUri)

  const cardCategory = await CardCategory.findOne({ ID: ccg })
  const vehicleType = await VehicleType.findOne({ VehicleTypeID: vtId })
  const subscriptionType = await SubscriptionType.findOne({ ID: stId })

  if (!cardCategory) throw new Error(`CardCategory not found for ID=${ccg}`)
  if (!vehicleType) throw new Error(`VehicleType not found for VehicleTypeID=${vtId}`)
  if (!subscriptionType) throw new Error(`SubscriptionType not found for ID=${stId}`)

  const rule = new SubscriptionPricingRule({
    CardCategoryID: cardCategory._id,
    VehicleTypeID: vehicleType._id,
    SubscriptionTypeID: subscriptionType._id
  })

  await rule.save()

  console.log('✅ Created rule')
  console.log('Business rule ID:', rule.ID)
  console.log('Mongo _id:', rule._id.toString())

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
