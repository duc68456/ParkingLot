const mongoose = require('mongoose')

const cardSchema = new mongoose.Schema({
  CardID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^CRD\d{4}$/
  },
  CardCategoryID: {
    type: String,
    required: true,
    ref: 'CardCategory'
  },
  OwnerID: {
    type: String,
    ref: 'Person',
    default: null
  },
  VehicleId: {
    type: String,
    ref: 'Vehicle',
    default: null
  },
  ActiveDay: {
    type: Date,
    required: true,
    default: Date.now
  },
  ExpireDay: {
    type: Date,
    default: null
  },
  UID: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 64
  },
  IsActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Auto-generate CardID before saving
cardSchema.pre('save', async function (next) {
  if (!this.CardID) {
    const lastCard = await this.constructor.findOne({}, {}, { sort: { 'CardID': -1 } })

    if (lastCard && lastCard.CardID) {
      const lastNumber = parseInt(lastCard.CardID.substring(3))
      const nextNumber = lastNumber + 1
      this.CardID = `CRD${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.CardID = 'CRD0001'
    }
  }
  next()
})

// Configure toJSON
cardSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Card', cardSchema)
