const mongoose = require('mongoose')

const singlePricingRuleSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^SPR\d{4}$/
  },
  SinglePricingRulePrev: {
    type: String,
    ref: 'SinglePricingRule',
    default: null
  },
  CardCategoryID: {
    type: String,
    required: true,
    ref: 'CardCategory'
  },
  VehicleTypeID: {
    type: String,
    required: true,
    ref: 'VehicleType'
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
  ChangedAt: {
    type: Date,
    default: Date.now
  },
  ChangedBy: {
    type: String,
    required: true,
    ref: 'Employee'
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
singlePricingRuleSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastRule = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastRule && lastRule.ID) {
      const lastNumber = parseInt(lastRule.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `SPR${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SPR0001'
    }
  }
  next()
})

// Configure toJSON
singlePricingRuleSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('SinglePricingRule', singlePricingRuleSchema)
