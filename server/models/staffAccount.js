const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const staffAccountSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^STA\d{4}$/, 'Staff account ID must follow format STA0001']
    // Auto-generated in pre-save hook
  },

  EmployeeID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee reference is required'],
    unique: true
  },

  PINCode: {
    type: String,
    required: [true, 'PIN code is required'],
    unique: true,
    maxlength: [8, 'PIN code cannot exceed 8 characters']
    // Will be hashed before save
  },

  Status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['ACTIVE', 'LOCKED', 'EXPIRED'],
      message: '{VALUE} is not a valid status'
    },
    default: 'ACTIVE'
  },

  LastLoginAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true
});

// Indexes for faster queries
staffAccountSchema.index({ ID: 1 });
staffAccountSchema.index({ EmployeeID: 1 });
staffAccountSchema.index({ PINCode: 1 });
staffAccountSchema.index({ Status: 1 });

// Virtual: Populate employee details
staffAccountSchema.virtual('employee', {
  ref: 'Employee',
  localField: 'EmployeeID',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save hook: Auto-generate ID and hash PIN code
 */
staffAccountSchema.pre('save', async function (next) {
  // Auto-generate ID
  if (this.isNew && !this.ID) {
    try {
      const StaffAccount = mongoose.model('StaffAccount');

      const lastStaffAccount = await StaffAccount
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastStaffAccount && lastStaffAccount.ID) {
        const match = lastStaffAccount.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      this.ID = `STA${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Hash PIN code if modified
  if (this.isModified('PINCode')) {
    try {
      const saltRounds = 10;
      this.PINCode = await bcrypt.hash(this.PINCode, saltRounds);
    } catch (error) {
      return next(error);
    }
  }

  next();
});

/**
 * Method to compare PIN code
 */
staffAccountSchema.methods.comparePin = async function (candidatePin) {
  return await bcrypt.compare(candidatePin, this.PINCode);
};

staffAccountSchema.set('toJSON', {
  virtuals: true,
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    // Don't expose PIN code
    delete returnedObject.PINCode;
  }
});

module.exports = mongoose.model('StaffAccount', staffAccountSchema);
