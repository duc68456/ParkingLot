const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
  {
    RoleID: {
      type: String,
      ref: 'Role',
      required: true,
      uppercase: true,
      trim: true
    },
    PermissionID: {
      type: String,
      ref: 'Permission',
      required: true,
      uppercase: true,
      trim: true
    }
  },
  { timestamps: false }
);

rolePermissionSchema.index({ RoleID: 1, PermissionID: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
