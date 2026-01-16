const mongoose = require('mongoose')

const CARD_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'PENDING_RFID',
  'DAMAGED',
  'LOST',
  'EXPIRED',
  'SUSPENDED',
  'RETURNED',
  'UNASSIGNED'
]

const cardSchema = new mongoose.Schema({
  CardID: {
    type: String,
    required: false,
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
    trim: true,
    maxLength: 64
    // Note: Validation for new UID format (UID-XXXX) is done at controller level
    // to allow backward compatibility with existing card UIDs
  },
  // ✅ CHANGED: IsActive → Status (multi-state)
  Status: {
    type: String,
    enum: {
      values: CARD_STATUSES,
      message: '{VALUE} is not a valid status'
    },
    required: true,
    default: 'ACTIVE'
  },

  // NEW: Tracking RFID
  UIDScannedAt: {
    type: Date,
    default: null
  },
  UIDScannedBy: {
    // Employee custom string ID (e.g. EMP0001)
    type: String,
    ref: 'Employee',
    default: null
  }
}, {
  timestamps: true
})

// Indexes similar to dbdiagram
cardSchema.index({ OwnerID: 1, Status: 1 })

// Enforce UID uniqueness only when it's actually set.
// This supports the workflow where cards enter inventory with blank UID and get scanned later.
cardSchema.index(
  { UID: 1 },
  {
    unique: true,
    partialFilterExpression: { UID: { $type: 'string' } }
  }
)

cardSchema.index({ UID: 1, Status: 1 })

// Auto-generate CardID before saving
cardSchema.pre('save', async function (next) {
  // Backwards compatibility: if older docs still set IsActive, map to Status.
  // (We keep this lightweight to avoid breaking existing create/update calls.)
  if (this.IsActive !== undefined && this.Status === undefined) {
    this.Status = this.IsActive ? 'ACTIVE' : 'INACTIVE'
  }

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
