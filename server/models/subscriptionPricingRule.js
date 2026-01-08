const mongoose = require('mongoose')

const subscriptionPricingRuleSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SPS\d{4}$/
  },
  CardCategoryID: {
    // Store business ID (e.g. CAT0001)
    type: String,
    required: true,
    index: true
  },
  VehicleTypeID: {
    // Store business ID (e.g. VT0001)
    type: String,
    required: true,
    index: true
  },
  SubscriptionTypeID: {
    // Store business ID (e.g. ST0001)
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
})

// Composite unique index
subscriptionPricingRuleSchema.index(
  { CardCategoryID: 1, VehicleTypeID: 1, SubscriptionTypeID: 1 },
  { unique: true }
)

// Auto-generate ID before saving
subscriptionPricingRuleSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastRule = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastRule && lastRule.ID) {
      const lastNumber = parseInt(lastRule.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `SPS${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SPS0001'
    }
  }
  next()
})

// Configure toJSON
subscriptionPricingRuleSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    // Preserve business ID and expose mongo id separately
    returnedObject.mongoId = returnedObject._id.toString()
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('SubscriptionPricingRule', subscriptionPricingRuleSchema)
