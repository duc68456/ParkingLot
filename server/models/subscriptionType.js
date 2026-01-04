const mongoose = require('mongoose')

const subscriptionTypeSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^SUB\d{4}$/
  },
  TypeName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 30
  },
  DurationDays: {
    type: Number,
    required: true,
    min: 1
  },
  Description: {
    type: String,
    maxLength: 256,
    default: null
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
subscriptionTypeSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastSubscriptionType = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastSubscriptionType && lastSubscriptionType.ID) {
      const lastNumber = parseInt(lastSubscriptionType.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `SUB${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SUB0001'
    }
  }
  next()
})

// Configure toJSON
subscriptionTypeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('SubscriptionType', subscriptionTypeSchema)
