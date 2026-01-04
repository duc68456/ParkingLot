const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^SSN\d{4}$/
  },
  ProcessedBy: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  ProcessedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  CustomerID: {
    type: String,
    ref: 'Customer',
    default: null
  },
  VehicleID: {
    type: String,
    required: true,
    ref: 'Vehicle'
  },
  VehicleTypeID: {
    type: String,
    required: true,
    ref: 'VehicleType'
  },
  CardID: {
    type: String,
    required: true,
    ref: 'Card'
  },
  SubscriptionTypeID: {
    type: String,
    required: true,
    ref: 'SubscriptionType'
  },
  PricePaid: {
    type: Number,
    required: true,
    min: 0
  },
  StartDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  EndDate: {
    type: Date,
    required: true
  },
  IsSuspended: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
subscriptionSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastSubscription = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastSubscription && lastSubscription.ID) {
      const lastNumber = parseInt(lastSubscription.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `SSN${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'SSN0001'
    }
  }
  next()
})

// Configure toJSON
subscriptionSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Subscription', subscriptionSchema)
