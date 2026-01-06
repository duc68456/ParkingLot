/* eslint-disable no-console */
/**
 * Seed (bootstrap) the first Admin account.
 *
 * Why this exists:
 * - Creating admin accounts is protected by admin-only JWT.
 * - But you need an admin account to login and get the first JWT.
 *
 * This script creates: Person -> Employee (ADMIN) -> AdminAccount
 *
 * Usage (Windows cmd.exe):
 *   cd server
 *   node scripts/seedAdmin.js
 *
 * Optional env overrides:
 *   SEED_ADMIN_USERNAME=admin
 *   SEED_ADMIN_PASSWORD=admin123
 *   SEED_ADMIN_FULLNAME="System Admin"
 *   SEED_ADMIN_PHONE=+84123456789
 *   SEED_ADMIN_GENDER=MALE
 *
 * Safety:
 * - If an AdminAccount with the username already exists, it will NOT create a duplicate.
 */

const mongoose = require('mongoose')

const config = require('../utils/config')

// Ensure models are registered
require('../models/person')
require('../models/employee')
const AdminAccount = require('../models/adminAccount')
const Person = mongoose.model('Person')
const Employee = mongoose.model('Employee')

const username = (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD || 'admin123'
const fullName = process.env.SEED_ADMIN_FULLNAME || 'System Admin'
const phone = process.env.SEED_ADMIN_PHONE || '+84123456789'
const gender = process.env.SEED_ADMIN_GENDER || 'MALE'

async function main() {
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Set it in server/.env')
  }

  console.log('[seed-admin] connecting to MongoDB...')
  await mongoose.connect(config.MONGODB_URI)

  try {
    const existing = await AdminAccount.findOne({ Username: username }).lean()
    if (existing) {
      console.log(`[seed-admin] admin username "${username}" already exists. Nothing to do.`)
      console.log('[seed-admin] You can login with:')
      console.log(`  Username: ${username}`)
      console.log('  Password: (the one you set when creating it)')
      return
    }

    console.log('[seed-admin] creating Person...')
    const person = await Person.create({
      FullName: fullName,
      Phone: phone,
      Gender: gender,
      IsActive: true
    })

    console.log('[seed-admin] creating Employee (ADMIN)...')
    const employee = await Employee.create({
      PersonID: person.ID || person._id,
      EmployeeType: 'ADMIN',
      Status: 'ACTIVE'
    })

    console.log('[seed-admin] creating AdminAccount...')
    const PasswordHash = await AdminAccount.hashPassword(password)
    const adminAccount = await AdminAccount.create({
      EmployeeID: employee._id,
      Username: username,
      PasswordHash,
      Status: 'ACTIVE'
    })

    console.log('[seed-admin] ✅ done')
    console.log('---')
    console.log('Created:')
  console.log(`  PersonID: ${person.ID || person._id}`)
  console.log(`  EmployeeID: ${employee._id}`)
    console.log(`  AdminAccountID: ${adminAccount._id}`)
    console.log('Credentials:')
    console.log(`  Username: ${username}`)
    console.log(`  Password: ${password}`)
    console.log('Next step: call POST /api/admin-accounts/login to get a JWT token for Postman.')
  } finally {
    await mongoose.disconnect()
    console.log('[seed-admin] disconnected')
  }
}

main().catch(err => {
  console.error('[seed-admin] failed:', err)
  process.exit(1)
})
