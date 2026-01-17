const mongoose = require('mongoose')

const shiftReportDetailSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SHRD\d{4}$/
  },
  // Business ID of the ShiftReport (e.g. SHR0001)
  ShiftReportID: {
    type: String,
    required: true,
    ref: 'ShiftReport',
    index: true
  },
  VehicleTypeID: {
    type: String,
    required: true,
    ref: 'VehicleType',
    trim: true,
    uppercase: true
  },
  Count: {
    type: Number,
    default: 0,
    min: 0
  },
  // Intentionally no Revenue here (per DB schema)
}, {
  timestamps: true
})

shiftReportDetailSchema.index({ ShiftReportID: 1, VehicleTypeID: 1 }, { unique: true })

shiftReportDetailSchema.pre('save', async function (next) {
  if (!this.ID) {
    const last = await this.constructor.findOne({}, {}, { sort: { ID: -1 } })
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(4), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      this.ID = `SHRD${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SHRD0001'
    }
  }
  next()
})

// When using findOneAndUpdate({ upsert:true }), Mongoose does NOT run pre('save'),
// which means our custom business ID generator above won't execute.
// As a result, inserted docs may get ID = null and violate the unique index on ID.
// This hook ensures upserts also receive a generated ID.
shiftReportDetailSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {}

    // If caller already provides ID, do nothing.
    const existingId = update?.$setOnInsert?.ID ?? update?.$set?.ID ?? update?.ID
    if (existingId) return next()

    // Only generate an ID when this operation is an upsert.
    const opts = this.getOptions ? this.getOptions() : {}
    if (!opts?.upsert) return next()

    const last = await this.model.findOne({}, { ID: 1 }, { sort: { ID: -1 } }).lean()
    let nextId = 'SHRD0001'
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(4), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      nextId = `SHRD${nextNumber.toString().padStart(4, '0')}`
    }

    // Ensure $setOnInsert exists and attach the generated ID.
    if (!update.$setOnInsert) update.$setOnInsert = {}
    update.$setOnInsert.ID = nextId

    this.setUpdate(update)
    return next()
  } catch (err) {
    return next(err)
  }
})

shiftReportDetailSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.mongoId = returnedObject._id.toString()
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('ShiftReportDetail', shiftReportDetailSchema)
