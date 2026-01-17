/*
  One-time migration: drop legacy unique index on ShiftReportDetail(ReportID, VehicleTypeID).

  Why:
    - We renamed field ReportID -> ShiftReportID.
    - Old MongoDB index ReportID_1_VehicleTypeID_1 can still exist in the collection.
    - When you upsert new documents, Mongo sees ReportID as null (field doesn't exist),
      and with unique index it treats { ReportID: null, VehicleTypeID: "VTP0001" } as a unique key.
      First insert succeeds, next insert fails with E11000 dup key.

  Run:
    node scripts\dropLegacyShiftReportDetailIndex.js

  Notes:
    - Requires MONGODB_URI in environment (same as other scripts).
*/

const mongoose = require('mongoose')
const ShiftReportDetail = require('../models/shiftReportDetail')

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

const main = async () => {
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI (or MONGO_URI) env var')
  }

  await mongoose.connect(mongoUri)

  const collection = ShiftReportDetail.collection
  const indexes = await collection.indexes()

  const legacy = indexes.find((i) => i?.name === 'ReportID_1_VehicleTypeID_1')
  if (!legacy) {
    // eslint-disable-next-line no-console
    console.log('[dropLegacyShiftReportDetailIndex] legacy index not found (already dropped)')
    await mongoose.disconnect()
    return
  }

  // eslint-disable-next-line no-console
  console.log('[dropLegacyShiftReportDetailIndex] found legacy index:', {
    name: legacy.name,
    key: legacy.key,
    unique: legacy.unique
  })

  await collection.dropIndex('ReportID_1_VehicleTypeID_1')

  // eslint-disable-next-line no-console
  console.log('[dropLegacyShiftReportDetailIndex] dropped index ReportID_1_VehicleTypeID_1')

  await mongoose.disconnect()
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[dropLegacyShiftReportDetailIndex] failed:', err)
  process.exit(1)
})
