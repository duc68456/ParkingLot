const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^EMP\d{4}$/, 'Employee ID must follow format EMP0001']
    // Auto-generated in pre-save hook
  },

  // Reference to Person (inheritance pattern)
  PersonID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'Person reference is required'],
    unique: true
  },

  EmployeeType: {
    type: String,
    required: [true, 'Employee type is required'],
    enum: {
      values: ['STAFF', 'MANAGER', 'ADMIN'],
      message: '{VALUE} is not a valid employee type'
    },
    default: 'STAFF'
  },

  HiredDate: {
    type: Date,
    required: [true, 'Hired date is required'],
    default: Date.now
  },

  Status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'],
      message: '{VALUE} is not a valid status'
    },
    default: 'ACTIVE'
  }

}, {
  timestamps: true
});

// Indexes for faster queries
employeeSchema.index({ ID: 1 });
employeeSchema.index({ PersonID: 1 });
employeeSchema.index({ Status: 1 });
employeeSchema.index({ EmployeeType: 1 });
employeeSchema.index({ HiredDate: 1 });

// Virtual: Populate person details
employeeSchema.virtual('person', {
  ref: 'Person',
  localField: 'PersonID',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save hook: Auto-generate ID
 * Format: EMP[SEQUENCE]
 * Example: EMP0001
 */
employeeSchema.pre('save', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const Employee = mongoose.model('Employee');

      // Find the last employee ID
      const lastEmployee = await Employee
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastEmployee && lastEmployee.ID) {
        // Extract the sequence number from the last employee ID
        const match = lastEmployee.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      // Generate new employee ID with 4-digit padding
      this.ID = `EMP${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

employeeSchema.set('toJSON', {
  virtuals: true,
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
