/* eslint-disable no-console */

const mongoose = require('mongoose')
const config = require('../utils/config')
const EntrySession = require('../models/entrySession')

async function main() {
  await mongoose.connect(config.MONGODB_URI)

  const doc = new EntrySession({
    VehicleID: null,
    VehicleTypeID: 'TEST',
    CardID: 'TEST',
    ProcessedEntryBy: 'EMPTEST',
    Status: 'IN_PARKING'
  })

  try {
    await doc.validate()
    console.log('validate ok')
    console.log('generated ID:', doc.ID)
  } catch (e) {
    console.error('validate failed:', e?.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
