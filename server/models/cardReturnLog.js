const mongoose = require('mongoose')

/**
 * CardReturnLog - Simple log model for tracking card returns
 * Used for statistics and audit trail
 */
const cardReturnLogSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    index: true,
    match: /^CRL\d{4}$/
  },

  CardID: {
    type: String,
    required: true,
    ref: 'Card'
  },

  OwnerID: {
    type: String,
    required: true,
    ref: 'Person'
  },

  OwnerType: {
    type: String,
    enum: ['CUSTOMER', 'EMPLOYEE'],
    default: 'CUSTOMER'
  },

  RefundPrice: {
    type: Number,
    min: 0,
    default: 0
  },

  PerformedBy: {
    type: String,
    required: true,
    ref: 'Employee'
  },

  Reason: {
    type: String,
    maxLength: 500,
    default: null
  }
}, {
  timestamps: true
})

// Indexes for statistics queries
cardReturnLogSchema.index({ createdAt: -1 })
cardReturnLogSchema.index({ PerformedBy: 1 })
cardReturnLogSchema.index({ OwnerID: 1 })

// Auto-generate ID before saving
cardReturnLogSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastLog = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastLog && lastLog.ID) {
      const lastNumber = parseInt(lastLog.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `CRL${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'CRL0001'
    }
  }
  next()
})

// Configure toJSON
cardReturnLogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('CardReturnLog', cardReturnLogSchema)
