const rolesRouter = require('express').Router();

const Role = require('../models/role');
const Permission = require('../models/permission');
const RolePermission = require('../models/rolePermission');
const EmployeeRole = require('../models/employeeRole');

const middleware = require('../utils/middleware');

const generateNextRoleId = async () => {
  const last = await Role.findOne({}, { ID: 1 }).sort({ ID: -1 }).lean();
  let sequenceNumber = 1;
  if (last?.ID) {
    const match = String(last.ID).match(/\d{4}$/);
    if (match) sequenceNumber = parseInt(match[0], 10) + 1;
  }
  return `ROLE${String(sequenceNumber).padStart(4, '0')}`;
};

function normalizeRoleDoc(role) {
  if (!role) return null;
  return {
    ID: role.ID,
    Name: role.Name,
    Description: role.Description,
    IsActive: role.IsActive,
    UpdatedBy: role.UpdatedBy,
    CreatedAt: role.CreatedAt,
    UpdatedAt: role.UpdatedAt
  };
}

// -------------------- ROLES CRUD --------------------

// GET /api/roles?limit=500
rolesRouter.get('/', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '500', 10) || 500, 2000);
    const roles = await Role.find({}, null, { sort: { CreatedAt: -1 }, limit }).lean();

    return res.json({ success: true, data: { roles: roles.map(normalizeRoleDoc) } });
  } catch (error) {
    console.error('Get roles error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to get roles', details: error.message } });
  }
});

// POST /api/roles
rolesRouter.post('/', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const { Name, Description, IsActive } = req.body || {};
    const name = String(Name || '').trim();
    const description = String(Description || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Name is required', code: 'VALIDATION_ERROR' } });
    }

    const role = new Role({
      // Defensive fallback: guarantee required business ID exists.
      ID: await generateNextRoleId(),
      Name: name,
      Description: description || null,
      IsActive: IsActive !== false,
      UpdatedBy: req?.user?.employeeBusinessId || req?.user?.employeeId || req?.user?.username || 'SYSTEM'
    });

    await role.save();

    return res.status(201).json({ success: true, data: { role: normalizeRoleDoc(role.toJSON ? role.toJSON() : role) } });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to create role', details: error.message } });
  }
});

// PUT /api/roles/:id
rolesRouter.put('/:id', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const roleId = String(req.params.id || '').trim().toUpperCase();
    if (!roleId) {
      return res.status(400).json({ success: false, error: { message: 'Missing role id', code: 'VALIDATION_ERROR' } });
    }

    const { Name, Description, IsActive } = req.body || {};

    const update = {
      UpdatedBy: req?.user?.employeeBusinessId || req?.user?.employeeId || req?.user?.username || 'SYSTEM'
    };

    if (Name !== undefined) update.Name = String(Name || '').trim();
    if (Description !== undefined) update.Description = String(Description || '').trim();
    if (IsActive !== undefined) update.IsActive = Boolean(IsActive);

    const role = await Role.findOneAndUpdate({ ID: roleId }, { $set: update }, { new: true }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: { message: 'Role not found', code: 'ROLE_NOT_FOUND' } });
    }

    return res.json({ success: true, data: { role: normalizeRoleDoc(role) } });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to update role', details: error.message } });
  }
});

// DELETE /api/roles/:id
rolesRouter.delete('/:id', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const roleId = String(req.params.id || '').trim().toUpperCase();
    if (!roleId) {
      return res.status(400).json({ success: false, error: { message: 'Missing role id', code: 'VALIDATION_ERROR' } });
    }

    // Block deletion if assigned to any employee.
    const assignedCount = await EmployeeRole.countDocuments({ RoleID: roleId });
    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Role is assigned to employees and cannot be deleted',
          code: 'ROLE_IN_USE',
          details: `AssignedCount=${assignedCount}`
        }
      });
    }

    await RolePermission.deleteMany({ RoleID: roleId });
    const deleted = await Role.deleteOne({ ID: roleId });

    if (deleted?.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { message: 'Role not found', code: 'ROLE_NOT_FOUND' } });
    }

    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to delete role', details: error.message } });
  }
});

// -------------------- PERMISSIONS --------------------

// GET /api/roles/:id/permissions
rolesRouter.get('/:id/permissions', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const roleId = String(req.params.id || '').trim().toUpperCase();
    if (!roleId) {
      return res.status(400).json({ success: false, error: { message: 'Missing role id', code: 'VALIDATION_ERROR' } });
    }

    const links = await RolePermission.find({ RoleID: roleId }, { PermissionID: 1, _id: 0 }).lean();
    const permissions = (links || []).map((l) => String(l.PermissionID || '').toUpperCase()).filter(Boolean);

    return res.json({ success: true, data: { roleId, permissions } });
  } catch (error) {
    console.error('Get role permissions error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to get role permissions', details: error.message } });
  }
});

// PUT /api/roles/:id/permissions { permissions: [] }
rolesRouter.put('/:id/permissions', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const roleId = String(req.params.id || '').trim().toUpperCase();
    if (!roleId) {
      return res.status(400).json({ success: false, error: { message: 'Missing role id', code: 'VALIDATION_ERROR' } });
    }

    const incoming = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
    const permissionIds = incoming.map((p) => String(p || '').trim().toUpperCase()).filter(Boolean);

    // Make sure role exists.
    const roleExists = await Role.exists({ ID: roleId });
    if (!roleExists) {
      return res.status(404).json({ success: false, error: { message: 'Role not found', code: 'ROLE_NOT_FOUND' } });
    }

    // Replace-all semantics.
    await RolePermission.deleteMany({ RoleID: roleId });
    if (permissionIds.length) {
      await RolePermission.insertMany(
        permissionIds.map((pid) => ({ RoleID: roleId, PermissionID: pid })),
        { ordered: false }
      ).catch(() => {
        // ignore dup/ordered errors (should be none after delete)
      });
    }

    return res.json({ success: true, data: { roleId, permissions: permissionIds } });
  } catch (error) {
    console.error('Update role permissions error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to update role permissions', details: error.message } });
  }
});

module.exports = rolesRouter;
