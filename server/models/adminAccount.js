const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminAccountSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^ADM\d{4}$/, 'Admin account ID must follow format ADM0001']
    // Auto-generated in pre-save hook
  },

  EmployeeID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee reference is required'],
    unique: true
  },

  Username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [32, 'Username cannot exceed 32 characters'],
    minlength: [3, 'Username must be at least 3 characters']
  },

  PasswordHash: {
    type: String,
    required: [true, 'Password is required'],
    maxlength: [64, 'Password hash cannot exceed 64 characters']
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
adminAccountSchema.index({ ID: 1 });
adminAccountSchema.index({ EmployeeID: 1 });
adminAccountSchema.index({ Username: 1 });
adminAccountSchema.index({ Status: 1 });

// Virtual: Populate employee details
adminAccountSchema.virtual('employee', {
  ref: 'Employee',
  localField: 'EmployeeID',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save hook: Auto-generate ID
 */
adminAccountSchema.pre('save', async function (next) {
  // Auto-generate ID
  if (this.isNew && !this.ID) {
    try {
      const AdminAccount = mongoose.model('AdminAccount');

      const lastAdminAccount = await AdminAccount
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastAdminAccount && lastAdminAccount.ID) {
        const match = lastAdminAccount.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      this.ID = `ADM${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  next();
});

/**
 * Static method to hash password
 */
adminAccountSchema.statics.hashPassword = async function (password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Method to compare password
 */
adminAccountSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.PasswordHash);
};

adminAccountSchema.set('toJSON', {
  virtuals: true,
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    // Don't expose password hash
    delete returnedObject.PasswordHash;
  }
});

module.exports = mongoose.model('AdminAccount', adminAccountSchema);
