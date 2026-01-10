const mongoose = require('mongoose')

const singlePricingRuleSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SPR\d{4}$/
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
  }
}, {
  timestamps: true
})

// One master rule per (CardCategoryID, VehicleTypeID)
singlePricingRuleSchema.index({ CardCategoryID: 1, VehicleTypeID: 1 }, { unique: true })

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
