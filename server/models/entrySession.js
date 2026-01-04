const mongoose = require('mongoose')

const entrySessionSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^ENT\d{4}$/
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
  EntryTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  ProcessedEntryBy: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  ExitTime: {
    type: Date,
    default: null
  },
  ProcessedExitBy: {
    type: String,
    ref: 'Employee',
    default: null
  },
  Status: {
    type: String,
    required: true,
    enum: ['IN_PARKING', 'EXITED', 'LOST_TICKET', 'CANCELLED'],
    default: 'IN_PARKING'
  },
  CalculatedFee: {
    type: Number,
    min: 0,
    default: 0
  },
  FinalFee: {
    type: Number,
    min: 0,
    default: 0
  },
  DiscountReason: {
    type: String,
    enum: ['STAFF_FREE', 'SUBSCRIPTION', 'PROMO', 'MANUAL_OVERRIDE'],
    default: null
  }
}, {
  timestamps: true
})

// Composite unique index (CardID, EntryTime)
entrySessionSchema.index(
  { CardID: 1, EntryTime: 1 },
  { unique: true }
)

// Auto-generate ID before saving
entrySessionSchema.pre('save', async function (next) {
  if (!this.ID) {
    const lastSession = await this.constructor.findOne({}, {}, { sort: { 'ID': -1 } })

    if (lastSession && lastSession.ID) {
      const lastNumber = parseInt(lastSession.ID.substring(3))
      const nextNumber = lastNumber + 1
      this.ID = `ENT${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.ID = 'ENT0001'
    }
  }
  next()
})

// Configure toJSON
entrySessionSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('EntrySession', entrySessionSchema)
