const Employee = require('../models/employee');
const EmployeeRole = require('../models/employeeRole');
const RolePermission = require('../models/rolePermission');

const { ROLE_DEFINITIONS, buildEffectivePermissions } = require('./permissions');

const normalize = (v) => String(v || '').trim();
const upper = (v) => normalize(v).toUpperCase();

// Resolve roles + permissions from DB. Falls back to Employee.EmployeeType mapping
// if there are no EmployeeRole assignments (for backward compatibility).
async function resolveAuthzForEmployee(employeeBusinessId) {
  const employeeId = String(employeeBusinessId || '').trim().toUpperCase();
  if (!employeeId) return { employee: null, roleIds: [], permissions: [] };

  const employee = await Employee.findOne({ ID: employeeId }).lean();
  if (!employee) return { employee: null, roleIds: [], permissions: [] };

  // 1) Try explicit EmployeeRole assignments.
  const employeeRoles = await EmployeeRole.find({ EmployeeID: employeeId }, { RoleID: 1, _id: 0 }).lean();
  let roleIds = (employeeRoles || []).map((r) => String(r.RoleID || '').toUpperCase()).filter(Boolean);

  // 2) Fallback mapping from EmployeeType to default role
  if (!roleIds.length) {
    const employeeType = String(employee.EmployeeType || '').toUpperCase();
    if (employeeType === 'ADMIN') roleIds = ['ROLE_ADMIN'];
    else if (employeeType === 'MANAGER') roleIds = ['ROLE_MANAGER'];
    else roleIds = ['ROLE_STAFF'];
  }

  // Dynamic authz: RolePermission.PermissionID is already the plain-text permission code.
  // The server should union permissions across ALL roles for this employee.
  const dbRolePerms = await RolePermission.find(
    { RoleID: { $in: roleIds } },
    { RoleID: 1, PermissionID: 1, _id: 0 }
  ).lean();

  let permissions;
  if (dbRolePerms?.length) {
    permissions = Array.from(
      new Set(
        (dbRolePerms || [])
          .map((rp) => String(rp.PermissionID || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
  } else {
    // Fallback for legacy installs where RolePermission isn't used.
    permissions = buildEffectivePermissions(roleIds).map((p) => String(p || '').trim().toUpperCase());
  }

  // Ensure Permission docs exist check (optional; doesn't block)
  // We won't fetch Permission docs for performance. It's just codes.

  return {
    employee,
    roleIds,
    permissions: Array.from(new Set((permissions || []).filter(Boolean)))
  };
}

module.exports = {
  resolveAuthzForEmployee
};
