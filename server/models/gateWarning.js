const mongoose = require('mongoose')

const gateWarningSchema = new mongoose.Schema({
  ID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^GWN\d{4}$/
  },
  Type: {
    type: String,
    required: true,
    enum: ['ENTRY', 'EXIT', 'OTHER'],
    default: 'OTHER'
  },
  Message: {
    type: String,
    required: true,
    maxLength: 500
  },
  Gate: {
    type: Number,
    min: 1,
    max: 10,
    default: 1
  },
  ProcessedBy: {
    type: String,
    ref: 'Employee',
    required: true
  }
}, {
  timestamps: true
})

// Auto-generate ID before validation
gateWarningSchema.pre('validate', async function (next) {
  try {
    if (!this.ID) {
      const lastWarning = await this.constructor.findOne({}).sort({ createdAt: -1 }).select('ID').lean()

      const lastId = String(lastWarning?.ID || '').trim()
      const match = lastId.match(/^GWN(\d{4})$/)

      if (match) {
        const lastNumber = parseInt(match[1], 10)
        const nextNumber = lastNumber + 1
        this.ID = `GWN${String(nextNumber).padStart(4, '0')}`
      } else {
        const count = await this.constructor.estimatedDocumentCount()
        this.ID = `GWN${String(Math.max(1, count + 1)).padStart(4, '0')}`
      }
    }
    next()
  } catch (err) {
    next(err)
  }
})

// Configure toJSON
gateWarningSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('GateWarning', gateWarningSchema)
