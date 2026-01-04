const mongoose = require('mongoose')

const cardPurchaseInvoiceSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^INV\d{4}$/
  },
  CustomerID: {
    type: String,
    required: true,
    ref: 'Customer'
  },
  SaledBy: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  InvoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  Status: {
    type: String,
    required: true,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'],
    default: 'PENDING'
  },
  TotalAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
})

// Auto-generate ID before saving
cardPurchaseInvoiceSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastInvoice && lastInvoice.ID) {
      const lastNumber = parseInt(lastInvoice.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `INV${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'INV0001'
    }
  }
  next()
})

// Configure toJSON
cardPurchaseInvoiceSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('CardPurchaseInvoice', cardPurchaseInvoiceSchema)
