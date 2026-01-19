const mongoose = require('mongoose');

const employeeRoleSchema = new mongoose.Schema(
  {
    EmployeeID: {
      type: String,
      ref: 'Employee',
      required: true,
      uppercase: true,
      trim: true
    },
    RoleID: {
      type: String,
      ref: 'Role',
      required: true,
      uppercase: true,
      trim: true
    },
    AssignedBy: {
      type: String,
      ref: 'Employee',
      default: null
    },
    AssignedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

employeeRoleSchema.index({ EmployeeID: 1, RoleID: 1 }, { unique: true });
employeeRoleSchema.index({ EmployeeID: 1 });

module.exports = mongoose.model('EmployeeRole', employeeRoleSchema);
