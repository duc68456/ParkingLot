const mongoose = require('mongoose')

const subscriptionPricingRuleDetailSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: false,
    unique: true,
    index: true,
    match: /^SPD\d{4}$/
  },
  SubscriptionPricingRuleDetailPrev: {
    type: String,
    ref: 'SubscriptionPricingRuleDetail',
    default: null
  },
  SubscriptionPricingRuleID: {
    type: String,
    required: true,
    ref: 'SubscriptionPricingRule'
  },
  Price: {
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
  Reason: {
    type: String,
    maxLength: 256,
    default: null
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
subscriptionPricingRuleDetailSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastDetail = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastDetail && lastDetail.ID) {
      const lastNumber = parseInt(lastDetail.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `SPD${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SPD0001'
    }
  }
  next()
})

// Configure toJSON
subscriptionPricingRuleDetailSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    // Preserve business ID and expose mongo id separately
    returnedObject.mongoId = returnedObject._id.toString()
    // Keep `id` as a stable identifier for clients; prefer business ID when available
    returnedObject.id = returnedObject.ID || returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('SubscriptionPricingRuleDetail', subscriptionPricingRuleDetailSchema)
