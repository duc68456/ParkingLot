const mongoose = require('mongoose')

const singlePricingRuleDetailSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SPRD\d{4}$/
  },
  SinglePricingRuleDetailPrev: {
    type: String,
    ref: 'SinglePricingRuleDetail',
    default: null
  },
  SinglePricingRuleID: {
    type: String,
    required: true,
    ref: 'SinglePricingRule'
  },
  DayPrice: {
    type: Number,
    required: true,
    min: 0
  },
  HourPrice: {
    type: Number,
    required: true,
    min: 0
  },
  NextHourPrice: {
    type: Number,
    required: true,
    min: 0
  },
  StartDateApply: {
    type: Date,
    required: true,
    default: Date.now
  },
  ChangedBy: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  ChangedAt: {
    type: Date,
    default: Date.now
  },
  Reason: {
    type: String,
    maxLength: 256,
    default: null
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
singlePricingRuleDetailSchema.pre('save', async function (next) {
  if (!this.ID) {
    const last = await this.constructor.findOne({}, {}, { sort: { ID: -1 } })
    if (last?.ID) {
      const lastNumber = parseInt(String(last.ID).substring(4), 10)
      const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1
      this.ID = `SPRD${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SPRD0001'
    }
  }
  next()
})

singlePricingRuleDetailSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('SinglePricingRuleDetail', singlePricingRuleDetailSchema)
