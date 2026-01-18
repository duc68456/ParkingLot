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
    min: 0
  },
  TotalRevenue: {
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

// When using findOneAndUpdate({ upsert:true }), Mongoose does NOT run pre('save'),
// so our business ID generator above won't execute.
// That can cause inserted docs to have ID = null and violate the unique index on ID.
// This hook ensures upserts also receive a generated ID.
shiftReportSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {}

    const existingId = update?.$setOnInsert?.ID ?? update?.$set?.ID ?? update?.ID
    if (existingId) return next()

    const opts = this.getOptions ? this.getOptions() : {}
    if (!opts?.upsert) return next()

    const last = await this.model.findOne({}, { ID: 1 }, { sort: { ID: -1 } }).lean()
    let nextId = 'SHR0001'
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(3), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      nextId = `SHR${nextNumber.toString().padStart(4, '0')}`
    }

    if (!update.$setOnInsert) update.$setOnInsert = {}
    update.$setOnInsert.ID = nextId
    this.setUpdate(update)
    return next()
  } catch (err) {
    return next(err)
  }
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
