/*
  One-time migration: drop the legacy UNIQUE index on shifts(EmployeeID, ShiftDate).

  Why:
    We now create a new Shift record on every staff login.
    The old schema used a unique index {EmployeeID:1, ShiftDate:1} which prevents
    multiple shifts per day.

  Usage (cmd.exe):
    cd server
    node scripts\dropUniqueShiftIndex.js

  Notes:
    - Uses MONGODB_URI from server/.env
    - Safe to run multiple times (it will no-op if index not found)
*/

require('dotenv').config()
const mongoose = require('mongoose')

require('../models/shift')

const TARGET_INDEX = 'EmployeeID_1_ShiftDate_1'

async function main () {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Missing MONGODB_URI in environment (.env)')

  await mongoose.connect(uri)
  const db = mongoose.connection

  const collection = db.collection('shifts')
  const indexes = await collection.indexes()

  const hasTarget = indexes.some(ix => ix?.name === TARGET_INDEX)
  if (!hasTarget) {
    console.log(`[dropUniqueShiftIndex] index not found: ${TARGET_INDEX} (nothing to do)`) // eslint-disable-line no-console
    return
  }

  const target = indexes.find(ix => ix?.name === TARGET_INDEX)
  console.log('[dropUniqueShiftIndex] found index:', target) // eslint-disable-line no-console

  // Only drop if it is unique (safety)
  if (!target?.unique) {
    console.log(`[dropUniqueShiftIndex] index ${TARGET_INDEX} is not unique; refusing to drop automatically`) // eslint-disable-line no-console
    return
  }

  await collection.dropIndex(TARGET_INDEX)
  console.log(`[dropUniqueShiftIndex] dropped unique index: ${TARGET_INDEX}`) // eslint-disable-line no-console
}

main()
  .catch(err => {
    console.error('[dropUniqueShiftIndex] failed:', err) // eslint-disable-line no-console
    process.exitCode = 1
  })
  .finally(async () => {
    try { await mongoose.disconnect() } catch (e) {}
  })
