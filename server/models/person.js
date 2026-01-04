const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^PER\d{4}$/, 'Person ID must follow format PER0001']
    // Auto-generated in pre-save hook
  },

  FullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },

  Phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters'],
    match: [/^[0-9+\-\s()]+$/, 'Invalid phone number format']
  },

  Gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['MALE', 'FEMALE', 'OTHER'],
      message: '{VALUE} is not a valid gender'
    }
  },

  IsActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Indexes for faster queries
personSchema.index({ ID: 1 });
personSchema.index({ Phone: 1 });
personSchema.index({ IsActive: 1 });
personSchema.index({ FullName: 1 });

/**
 * Pre-save hook: Auto-generate ID
 * Format: PER[SEQUENCE]
 * Example: PER0001
 */
personSchema.pre('save', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const Person = mongoose.model('Person');

      // Find the last person ID
      const lastPerson = await Person
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastPerson && lastPerson.ID) {
        // Extract the sequence number from the last person ID
        const match = lastPerson.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      // Generate new person ID with 4-digit padding
      this.ID = `PER${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

personSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('Person', personSchema);
