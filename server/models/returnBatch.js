const mongoose = require('mongoose')

const returnBatchSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^RTB\d{4}$/
  },
  InvoiceID: {
    type: String,
    required: true,
    unique: true,
    ref: 'CardPurchaseInvoice'
  },
  TotalCardsInInvoice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  TotalCardsRequested: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  TotalCardsApproved: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  TotalCardsRejected: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  TotalOriginalAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  TotalRefundAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  RefundStatus: {
    type: String,
    required: true,
    enum: ['PARTIAL', 'FULL', 'ZERO', 'FULL_PROCESSED', 'PARTIAL_PROCESSED'],
    default: 'ZERO'
  },
  LastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
returnBatchSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastBatch = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastBatch && lastBatch.ID) {
      const lastNumber = parseInt(lastBatch.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `RTB${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'RTB0001'
    }
  }

  // Update LastUpdatedAt
  this.LastUpdatedAt = new Date()

  next()
})

// Configure toJSON
returnBatchSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('ReturnBatch', returnBatchSchema)
