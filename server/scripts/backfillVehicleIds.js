/*
  Backfill VehicleID values for existing Vehicle documents.

  Usage (Windows cmd):
    node server/scripts/backfillVehicleIds.js

  Notes:
  - Only updates documents missing VehicleID.
  - Uses the same format as the schema: VEH0001.
*/

require('dotenv').config()
const mongoose = require('mongoose')
const Vehicle = require('../models/vehicle')

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL

function parseSequence(vehicleId) {
  if (!vehicleId) return null
  const m = vehicleId.match(/^VEH(\d{4})$/i)
  if (!m) return null
  return Number.parseInt(m[1], 10)
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI (or MONGODB_URL) in environment')
  }

  await mongoose.connect(MONGODB_URI)

  const totalMissing = await Vehicle.countDocuments({
    $or: [{ VehicleID: { $exists: false } }, { VehicleID: null }, { VehicleID: '' }]
  })

  if (totalMissing === 0) {
    console.log('No vehicles missing VehicleID. Done.')
    return
  }

  const existing = await Vehicle.find({
    VehicleID: { $regex: /^VEH\d{4}$/i }
  }).select('VehicleID').lean()

  let maxSeq = 0
  for (const v of existing) {
    const seq = parseSequence(v.VehicleID)
    if (seq && seq > maxSeq) maxSeq = seq
  }

  const missing = await Vehicle.find({
    $or: [{ VehicleID: { $exists: false } }, { VehicleID: null }, { VehicleID: '' }]
  }).sort({ createdAt: 1 })

  let seq = maxSeq
  let updated = 0

  for (const doc of missing) {
    seq += 1
    doc.VehicleID = `VEH${String(seq).padStart(4, '0')}`
    await doc.save()
    updated += 1
  }

  console.log(`Updated ${updated} vehicle(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {
      // ignore
    }
  })
