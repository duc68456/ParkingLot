const mongoose = require('mongoose')

const shiftReportSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SHR\d{4}$/
  },
  ShiftID: {
    type: String,
    required: true,
    ref: 'Shift',
    unique: true,
    index: true
  },
  TotalVehicles: {
    type: Number,
    default: 0,
    min: 0
  },
  TotalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  SubscriptionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  SingleTicketCount: {
    type: Number,
    default: 0,
    min: 0
  },
  StaffFreeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  GeneratedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

shiftReportSchema.index({ ShiftID: 1 }, { unique: true })
shiftReportSchema.index({ GeneratedAt: 1 })

shiftReportSchema.pre('save', async function (next) {
  if (!this.ID) {
    const last = await this.constructor.findOne({}, {}, { sort: { ID: -1 } })
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(3), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      this.ID = `SHR${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SHR0001'
    }
  }
  next()
})

shiftReportSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.mongoId = returnedObject._id.toString()
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('ShiftReport', shiftReportSchema)
