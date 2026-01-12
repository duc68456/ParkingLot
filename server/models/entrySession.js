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
    default: null,
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
  LicensePlate: {
    type: String,
    trim: true,
    default: null
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

// Auto-generate ID before validation so required validation passes.
entrySessionSchema.pre('validate', async function (next) {
  try {
    if (!this.ID) {
      // Sort by newest document to avoid lexical sort pitfalls on the ID string.
      const lastSession = await this.constructor.findOne({}).sort({ createdAt: -1 }).select('ID').lean()

      const lastId = String(lastSession?.ID || '').trim()
      const match = lastId.match(/^ENT(\d{4})$/)

      if (match) {
        const lastNumber = parseInt(match[1], 10)
        const nextNumber = lastNumber + 1
        this.ID = `ENT${String(nextNumber).padStart(4, '0')}`
      } else {
        // Fallback: start sequence (or data is in unexpected shape)
        const count = await this.constructor.estimatedDocumentCount()
        // Start at 1; count may be >0 but IDs might be malformed, so keep simple.
        this.ID = `ENT${String(Math.max(1, count + 1)).padStart(4, '0')}`
      }
    }

    next()
  } catch (err) {
    next(err)
  }
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
