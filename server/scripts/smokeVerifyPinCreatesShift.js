/*
  Smoke: verify staff PIN creates today's shift.

  Usage:
    - Set env vars (or hardcode for local dev):
        STAFF_PIN=123456
        GATE=GATE_1
    - Run:
        node scripts/smokeVerifyPinCreatesShift.js

  Notes:
    - This script talks directly to MongoDB via the same models.
    - It does NOT hit HTTP endpoints (so it's safe even if auth middleware changes).
*/

const mongoose = require('mongoose')
const config = require('../utils/config')
const StaffAccount = require('../models/staffAccount')
const Shift = require('../models/shift')

const main = async () => {
  const pin = String(process.env.STAFF_PIN || '').trim()
  const gate = String(process.env.GATE || '').trim()

  if (!pin) {
    throw new Error('Missing STAFF_PIN env var')
  }

  await mongoose.connect(config.MONGODB_URI)

  // Find a matching ACTIVE staff account by comparing hashed PIN.
  const activeAccounts = await StaffAccount.find({ Status: 'ACTIVE' })
  let staffAccount = null
  for (const acc of activeAccounts) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await acc.comparePin(pin)
    if (ok) {
      staffAccount = acc
      break
    }
  }

  if (!staffAccount) {
    throw new Error('No ACTIVE staff account matched provided PIN')
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  // Mirror controller behavior: upsert shift.
  const ensuredShift = await Shift.findOneAndUpdate(
    {
      EmployeeID: staffAccount.EmployeeID,
      ShiftDate: { $gte: startOfToday, $lt: startOfTomorrow }
    },
    {
      $setOnInsert: {
        EmployeeID: staffAccount.EmployeeID,
        ShiftDate: startOfToday,
        CheckInTime: new Date(),
        Status: 'IN_PROGRESS',
        Gate: gate || null
      },
      ...(gate ? { $set: { Gate: gate } } : {})
    },
    { new: true, upsert: true }
  )

  const roundTrip = await Shift.findById(ensuredShift._id).lean()

  console.log('Matched staff account:', {
    ID: staffAccount.ID,
    EmployeeID: staffAccount.EmployeeID
  })

  console.log('Ensured shift:', {
    _id: String(roundTrip._id),
    ID: roundTrip.ID,
    EmployeeID: roundTrip.EmployeeID,
    ShiftDate: roundTrip.ShiftDate,
    CheckInTime: roundTrip.CheckInTime,
    Gate: roundTrip.Gate,
    Status: roundTrip.Status
  })

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch (e) {
    // ignore
  }
  process.exit(1)
})
