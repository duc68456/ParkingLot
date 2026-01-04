const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^CUS\d{4}$/, 'Customer ID must follow format CUS0001']
    // Auto-generated in pre-save hook
  },

  // Reference to Person (inheritance pattern)
  PersonID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'Person reference is required'],
    unique: true
  },

  RegisteredDay: {
    type: Date,
    required: [true, 'Registered day is required'],
    default: Date.now
  },

  Status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      message: '{VALUE} is not a valid status'
    },
    default: 'ACTIVE'
  }

}, {
  timestamps: true
});

// Indexes for faster queries
customerSchema.index({ ID: 1 });
customerSchema.index({ PersonID: 1 });
customerSchema.index({ Status: 1 });
customerSchema.index({ RegisteredDay: 1 });

// Virtual: Populate person details
customerSchema.virtual('person', {
  ref: 'Person',
  localField: 'PersonID',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save hook: Auto-generate ID
 * Format: CUS[SEQUENCE]
 * Example: CUS0001
 */
customerSchema.pre('save', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const Customer = mongoose.model('Customer');

      // Find the last customer ID
      const lastCustomer = await Customer
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastCustomer && lastCustomer.ID) {
        // Extract the sequence number from the last customer ID
        const match = lastCustomer.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      // Generate new customer ID with 4-digit padding
      this.ID = `CUS${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

customerSchema.set('toJSON', {
  virtuals: true,
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('Customer', customerSchema);
