const Employee = require('../models/employee');
const EmployeeRole = require('../models/employeeRole');
const Role = require('../models/role');
const RolePermission = require('../models/rolePermission');
const Permission = require('../models/permission');

const { ROLE_DEFINITIONS, buildEffectivePermissions } = require('./permissions');

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

  // If RolePermission/Permission tables are present and have rows for the roles,
  // use them; otherwise fall back to ROLE_DEFINITIONS (code-based).
  const dbRolePerms = await RolePermission.find(
    { RoleID: { $in: roleIds } },
    { RoleID: 1, PermissionID: 1, _id: 0 }
  ).lean();

  let permissions;
  if (dbRolePerms?.length) {
    // Merge + apply excludes based on ROLE_DEFINITIONS if a role defines excludes.
    const allow = Array.from(new Set(dbRolePerms.map((rp) => String(rp.PermissionID || '').toUpperCase()).filter(Boolean)));

    // Convert these permission IDs back to their original case format if stored differently.
    // We keep uppercase in DB but codes in app are uppercase anyway.
    const effective = buildEffectivePermissions(roleIds).
      map((p) => p.toUpperCase());

    // If DB is seeded properly, `allow` should match `effective`. But we will prioritize DB,
    // only applying excludes from code to preserve your "Manager excludes Access Hub" rule.
    const deny = (roleIds || [])
      .map((id) => ROLE_DEFINITIONS[id])
      .filter(Boolean)
      .flatMap((r) => (r.excludes || []).map((x) => String(x).toUpperCase()));

    permissions = allow.filter((p) => !deny.includes(p));

    // If DB allow list is empty (mis-seeded), fallback to code.
    if (!permissions.length && effective.length) permissions = effective;
  } else {
    permissions = buildEffectivePermissions(roleIds);
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
