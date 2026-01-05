const mongoose = require('mongoose')

const cardPurchaseDetailSchema = new mongoose.Schema({
  InvoiceID: {
    type: String,
    required: true,
    ref: 'CardPurchaseInvoice'
  },
  CardCategoryID: {
    type: String,
    required: true,
    ref: 'CardCategory'
  },
  Quantity: {
    type: Number,
    required: true,
    min: 1
  },
  UnitPrice: {
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

// Composite unique index (InvoiceID, CardCategoryID)
cardPurchaseDetailSchema.index(
  { InvoiceID: 1, CardCategoryID: 1 },
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
