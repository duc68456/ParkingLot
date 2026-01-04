const mongoose = require('mongoose')

const cardPurchaseDetailSchema = new mongoose.Schema({
  InvoiceID: {
    type: String,
    required: true,
    ref: 'CardPurchaseInvoice'
  },
  CardID: {
    type: String,
    required: true,
    ref: 'Card'
  },
  Price: {
    type: Number,
    required: true,
    min: 0
  },
  Notes: {
    type: String,
    maxLength: 256,
    default: null
  }
}, {
  timestamps: true
})

// Composite unique index (InvoiceID, CardID)
cardPurchaseDetailSchema.index(
  { InvoiceID: 1, CardID: 1 },
  { unique: true }
)

// Configure toJSON
cardPurchaseDetailSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('CardPurchaseDetail', cardPurchaseDetailSchema)
