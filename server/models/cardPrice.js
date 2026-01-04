const mongoose = require('mongoose')

const cardPriceSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^CPR\d{4}$/
  },
  CardPricePrev: {
    type: String,
    ref: 'CardPrice',
    default: null
  },
  CardCategoryID: {
    type: String,
    required: true,
    ref: 'CardCategory'
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
cardPriceSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastCardPrice = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastCardPrice && lastCardPrice.ID) {
      const lastNumber = parseInt(lastCardPrice.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `CPR${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'CPR0001'
    }
  }
  next()
})

// Configure toJSON
cardPriceSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('CardPrice', cardPriceSchema)
