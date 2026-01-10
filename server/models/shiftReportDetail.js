const mongoose = require('mongoose')

const shiftReportDetailSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SHRD\d{4}$/
  },
  ReportID: {
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
  Revenue: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
})

shiftReportDetailSchema.index({ ReportID: 1, VehicleTypeID: 1 }, { unique: true })

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

shiftReportDetailSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.mongoId = returnedObject._id.toString()
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('ShiftReportDetail', shiftReportDetailSchema)
