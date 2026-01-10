/*
  Smoke test: fetch a SinglePricingRule by business ID (SPRxxxx)
  and ensure related refs resolve without ObjectId cast errors.

  Usage:
    node scripts/smokeGetSinglePricingRuleByBusinessId.js SPR0001
*/

require('dotenv').config()
const mongoose = require('mongoose')

const SinglePricingRule = require('../models/singlePricingRule')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const Employee = require('../models/employee')

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Missing arg: SPR business ID (e.g. SPR0001)')
    process.exit(2)
  }

  const mongoUrl = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!mongoUrl) {
    console.error('Missing env: MONGODB_URI (or DATABASE_URL)')
    process.exit(2)
  }

  await mongoose.connect(mongoUrl)

  const rule = await SinglePricingRule
    .findOne({ ID: id })
    .populate({
      path: 'CardCategoryID',
      select: 'ID Name',
      localField: 'CardCategoryID',
      foreignField: 'ID',
      justOne: true,
      model: CardCategory
    })
    .populate({
      path: 'VehicleTypeID',
      select: 'VehicleTypeID Name',
      localField: 'VehicleTypeID',
      foreignField: 'VehicleTypeID',
      justOne: true,
      model: VehicleType
    })
    .populate({
      path: 'ChangedBy',
      select: 'ID EmployeeType',
      localField: 'ChangedBy',
      foreignField: 'ID',
      justOne: true,
      model: Employee
    })

  if (!rule) {
    console.log('Not found')
    return
  }

  console.log({
    ID: rule.ID,
    CardCategoryID: rule.CardCategoryID,
    VehicleTypeID: rule.VehicleTypeID,
    ChangedBy: rule.ChangedBy
  })
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('ERROR:', err.message)
    try {
      await mongoose.disconnect()
    } catch {
      // ignore
    }
    process.exit(1)
  })
