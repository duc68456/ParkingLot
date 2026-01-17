const mongoose = require('mongoose')

const shiftSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SHF\d{4}$/
  },
  EmployeeID: {
    type: String,
    required: true,
    ref: 'Employee',
    trim: true,
    uppercase: true,
    match: /^EMP\d{4}$/
  },
  ShiftDate: {
    type: Date,
    required: true
  },
  CheckInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  CheckOutTime: {
    type: Date,
    default: null
  },
  DurationHours: {
    type: Number,
    default: null
  },
  TotalVehicles: {
    type: Number,
    default: 0,
    min: 0
  },
  Gate: {
    type: String,
    maxLength: 20,
    default: null
  },
  Status: {
    type: String,
    default: 'IN_PROGRESS',
    maxLength: 20
  },
  CreatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// NOTE: We intentionally do NOT enforce uniqueness on (EmployeeID, ShiftDate).
// Requirement: create a new shift record every time staff logs in,
// while still storing ShiftDate as the date (start-of-day) for reporting.
// If you need to prevent duplicate shifts, handle it at the application level.
shiftSchema.index({ EmployeeID: 1, ShiftDate: 1 })

shiftSchema.pre('save', async function (next) {
  if (!this.ID) {
    const last = await this.constructor.findOne({}, {}, { sort: { ID: -1 } })
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(3), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      this.ID = `SHF${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SHF0001'
    }
  }

  // Keep DurationHours in sync when checkout exists
  if (this.CheckInTime && this.CheckOutTime) {
    const durationMs = new Date(this.CheckOutTime).getTime() - new Date(this.CheckInTime).getTime()
    if (!Number.isNaN(durationMs) && durationMs >= 0) {
      this.DurationHours = durationMs / (1000 * 60 * 60)
    }
  }

  next()
})

shiftSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.mongoId = returnedObject._id.toString()
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Shift', shiftSchema)
