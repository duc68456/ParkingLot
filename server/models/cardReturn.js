const mongoose = require('mongoose')

const cardReturnSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^CRT\d{4}$/
  },
  CardID: {
    type: String,
    required: true,
    unique: true,
    ref: 'Card'
  },
  InvoiceID: {
    type: String,
    required: true,
    ref: 'CardPurchaseInvoice'
  },
  ReturnReason: {
    type: String,
    required: true,
    enum: ['NOT_USED', 'DAMAGED', 'DEFECTIVE', 'CHANGED_MIND'],
    maxLength: 100
  },
  ReturnRequestDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  ReturnApprovalBy: {
    type: String,
    ref: 'Employee',
    default: null
  },
  OriginalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  RefundPrice: {
    type: Number,
    required: true,
    min: 0
  },
  RefundReason: {
    type: String,
    maxLength: 100,
    default: null
  },
  Status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'],
    default: 'PENDING'
  },
  RefundMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'EWALLET', 'CREDIT'],
    default: null
  },
  RefundTime: {
    type: Date,
    default: null
  },
  Notes: {
    type: String,
    maxLength: 256,
    default: null
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
cardReturnSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastReturn = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastReturn && lastReturn.ID) {
      const lastNumber = parseInt(lastReturn.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `CRT${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'CRT0001'
    }
  }
  next()
})

// Configure toJSON
cardReturnSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('CardReturn', cardReturnSchema)
