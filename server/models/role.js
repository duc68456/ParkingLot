const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    ID: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    Name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    Description: {
      type: String,
      default: null
    },

    IsActive: {
      type: Boolean,
      default: true
    },

    UpdatedBy: {
      type: String,
      ref: 'Employee',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'CreatedAt', updatedAt: 'UpdatedAt' }
  }
);

/**
 * Pre-validate hook: Auto-generate Role.ID
 * Format: ROLE[SEQUENCE]
 * Example: ROLE0001
 */
roleSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const Role = mongoose.model('Role');
      const last = await Role.findOne({}, { ID: 1 }).sort({ ID: -1 }).lean();

      let sequenceNumber = 1;
      if (last?.ID) {
        const match = String(last.ID).match(/\d{4}$/);
        if (match) sequenceNumber = parseInt(match[0], 10) + 1;
      }

      this.ID = `ROLE${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

roleSchema.index({ ID: 1 });
roleSchema.index({ Name: 1 });

module.exports = mongoose.model('Role', roleSchema);
