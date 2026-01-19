const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    ID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    Module: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    Name: {
      type: String,
      required: true,
      trim: true
    },
    Description: {
      type: String,
      default: null
    }
  },
  { timestamps: false }
);

/**
 * Pre-save hook: Auto-generate Permission.ID
 * We use the PermissionID as the "code" (e.g., DASHBOARD.VIEW).
 * If not provided, generate a synthetic one.
 * Format: PRM[SEQUENCE]
 * Example: PRM0001
 */
permissionSchema.pre('save', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const Permission = mongoose.model('Permission');
      const last = await Permission.findOne({}, { ID: 1 }).sort({ ID: -1 }).lean();

      let sequenceNumber = 1;
      if (last?.ID) {
        const match = String(last.ID).match(/\d{4}$/);
        if (match) sequenceNumber = parseInt(match[0], 10) + 1;
      }

      this.ID = `PRM${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

permissionSchema.index({ ID: 1 });
permissionSchema.index({ Module: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
