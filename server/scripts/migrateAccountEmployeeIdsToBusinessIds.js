/* eslint-disable no-console */
/**
 * Migration: convert AdminAccount.EmployeeID and StaffAccount.EmployeeID from Mongo ObjectId -> Employee business ID (EMP####).
 *
 * Why:
 * - We want account documents to store employee custom IDs, not Mongo IDs.
 *
 * Usage (Windows cmd.exe):
 *   cd server
 *   node scripts/migrateAccountEmployeeIdsToBusinessIds.js
 *
 * Env:
 *   MONGODB_URI or MONGO_URI; fallback mongodb://127.0.0.1:27017/parkinglot
 */

require('dotenv').config()
const mongoose = require('mongoose')

const config = require('../utils/config')

// Ensure models are registered
require('../models/employee')
require('../models/adminAccount')
require('../models/staffAccount')

const Employee = mongoose.model('Employee')
const AdminAccount = mongoose.model('AdminAccount')
const StaffAccount = mongoose.model('StaffAccount')

const isObjectId = (val) => /^[a-f\d]{24}$/i.test(String(val || '').trim())
const isEmployeeBusinessId = (val) => /^EMP\d{4}$/i.test(String(val || '').trim())

async function migrateModel(Model, modelName) {
  const docs = await Model.find({}, { EmployeeID: 1 }).lean()
  let scanned = 0
  let updated = 0
  let skipped = 0
  let missingEmployee = 0

  for (const doc of docs) {
    scanned += 1
    const raw = doc.EmployeeID

    if (!raw) {
      skipped += 1
      continue
    }

    if (isEmployeeBusinessId(raw)) {
      // already migrated
      skipped += 1
      continue
    }

    if (!isObjectId(raw)) {
      // unknown format
      skipped += 1
      continue
    }

    const employee = await Employee.findById(raw, { ID: 1 }).lean()
    if (!employee?.ID) {
      missingEmployee += 1
      continue
    }

    await Model.updateOne(
      { _id: doc._id },
      { $set: { EmployeeID: String(employee.ID).toUpperCase() } }
    )

    updated += 1
  }

  console.log(`[${modelName}] scanned=${scanned} updated=${updated} skipped=${skipped} missingEmployee=${missingEmployee}`)
  return { scanned, updated, skipped, missingEmployee }
}

async function main() {
  const uri = config.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkinglot'

  console.log('[migrate-accounts] connecting...')
  await mongoose.connect(uri)

  try {
    console.log('[migrate-accounts] migrating AdminAccount...')
    await migrateModel(AdminAccount, 'AdminAccount')

    console.log('[migrate-accounts] migrating StaffAccount...')
    await migrateModel(StaffAccount, 'StaffAccount')

    console.log('[migrate-accounts] ✅ done')
  } finally {
    await mongoose.disconnect()
    console.log('[migrate-accounts] disconnected')
  }
}

main().catch(async (err) => {
  console.error('[migrate-accounts] ❌ failed:', err)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
