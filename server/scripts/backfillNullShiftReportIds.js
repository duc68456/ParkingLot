/*
  One-time maintenance: backfill missing ShiftReport.ID and ShiftReportDetail.ReportID.

  Why:
    Older upsert-based logic may have inserted documents with ID = null,
    causing duplicate key errors and breaking references.

  What it does:
    1) Finds ShiftReport docs where ID is missing/null, generates an ID by saving (pre-save hook).
    2) Finds ShiftReportDetail docs where ReportID is missing/null, tries to resolve ReportID via ShiftID (if present) or leaves untouched.

  Usage (cmd.exe):
    cd server
    node scripts\backfillNullShiftReportIds.js

  Notes:
    - Uses MONGODB_URI from server/.env
    - Safe to re-run (idempotent)
*/

require('dotenv').config()
const mongoose = require('mongoose')

const ShiftReport = require('../models/shiftReport')
const ShiftReportDetail = require('../models/shiftReportDetail')

async function main () {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Missing MONGODB_URI in environment (.env)')

  await mongoose.connect(uri)

  const reports = await ShiftReport.find({ $or: [{ ID: null }, { ID: { $exists: false } }] })
  console.log(`[backfillNullShiftReportIds] shiftReports missing ID: ${reports.length}`) // eslint-disable-line no-console

  for (const r of reports) {
    // saving triggers pre('save') ID generator
    // eslint-disable-next-line no-await-in-loop
    await r.save()
    console.log('[backfillNullShiftReportIds] fixed shiftReport', { mongoId: r._id.toString(), ID: r.ID, ShiftID: r.ShiftID }) // eslint-disable-line no-console
  }

  const details = await ShiftReportDetail.find({ $or: [{ ReportID: null }, { ReportID: { $exists: false } }] })
  console.log(`[backfillNullShiftReportIds] shiftReportDetails missing ReportID: ${details.length}`) // eslint-disable-line no-console

  // We can't always reconstruct ReportID if it was never stored.
  // If any of these docs exist, it's best to delete/recreate them based on ShiftReport + VehicleTypes.
  // For now, we just print them so you can decide.
  for (const d of details) {
    console.log('[backfillNullShiftReportIds] orphan detail (manual fix needed)', {
      mongoId: d._id.toString(),
      ID: d.ID,
      ReportID: d.ReportID,
      VehicleTypeID: d.VehicleTypeID
    }) // eslint-disable-line no-console
  }
}

main()
  .catch(err => {
    console.error('[backfillNullShiftReportIds] failed:', err) // eslint-disable-line no-console
    process.exitCode = 1
  })
  .finally(async () => {
    try { await mongoose.disconnect() } catch (e) {}
  })
