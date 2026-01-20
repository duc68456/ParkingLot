const adminAccountsRouter = require('express').Router();
const AdminAccount = require('../models/adminAccount');
const Employee = require('../models/employee');
const { signToken } = require('../utils/auth');
const middleware = require('../utils/middleware');
const { resolveAuthzForEmployee } = require('../utils/authorization');

const isObjectId = (val) => /^[a-f\d]{24}$/i.test(String(val || '').trim());
const isEmployeeBusinessId = (val) => /^EMP\d{4}$/i.test(String(val || '').trim());

/**
 * Accept either an Employee Mongo _id or a business ID (EMP####).
 * Returns the employee business ID (EMP####) if resolvable, otherwise null.
 */
const resolveEmployeeBusinessId = async (employeeIdOrBusinessId) => {
  const raw = String(employeeIdOrBusinessId || '').trim();
  if (!raw) return null;

  if (isEmployeeBusinessId(raw)) return raw.toUpperCase();

  if (isObjectId(raw)) {
    const employee = await Employee.findById(raw, { ID: 1 }).lean();
    return employee?.ID ? String(employee.ID).toUpperCase() : null;
  }

  return null;
};

/**
 * GET /api/admin-accounts
 * Get all admin accounts with filtering and pagination
 */
adminAccountsRouter.get('/', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const {
      status,
      employeeId,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.Status = status.toUpperCase();
    }

    // Optional filter by employee (accepts Employee Mongo _id or business ID EMP####)
    if (employeeId) {
      const employeeBusinessId = await resolveEmployeeBusinessId(employeeId);
      if (!employeeBusinessId) {
        return response.status(400).json({
          success: false,
          error: {
            message: 'Invalid employeeId',
            code: 'INVALID_EMPLOYEE_ID'
          }
        });
      }
      filter.EmployeeID = employeeBusinessId;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query with employee population
    const adminAccounts = await AdminAccount.find(filter)
      .populate({
        path: 'employee',
        select: 'ID EmployeeType Status PersonID',
        populate: {
          path: 'person',
          select: 'ID FullName Phone'
        }
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await AdminAccount.countDocuments(filter);

    response.json({
      success: true,
      data: {
        adminAccounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get admin accounts error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get admin accounts',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/admin-accounts/:id
 * Get single admin account by ID
 */
adminAccountsRouter.get('/:id', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const adminAccount = await AdminAccount.findById(request.params.id)
      .populate({
        path: 'employee',
        select: 'ID EmployeeType Status HiredDate PersonID',
        populate: {
          path: 'person',
          select: 'ID FullName Phone Gender'
        }
      });

    if (!adminAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Admin account not found',
          code: 'ADMIN_ACCOUNT_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: adminAccount
    });
  } catch (error) {
    console.error('Get admin account by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get admin account',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/admin-accounts
 * Create new admin account
 *
 * Auth:
 * - system admin (request.user.type === 'admin') OR
 * - an employee token that includes a permission to manage admin accounts.
 */
adminAccountsRouter.post('/', middleware.authRequired, async (request, response) => {
  try {
    const permissionsRaw = request.user?.permissions || request.user?.Permissions || [];
    const permissions = (Array.isArray(permissionsRaw) ? permissionsRaw : [])
      .map((p) => String(p || '').trim().toUpperCase())
      .filter(Boolean);

    const canManageAdminAccounts =
      request.user?.type === 'admin' ||
      permissions.includes('PEOPLE.ACCESS_MANAGEMENT_HUB');

    if (!canManageAdminAccounts) {
      return response.status(403).json({
        success: false,
        error: { message: 'forbidden', code: 'FORBIDDEN' }
      });
    }

    const {
      EmployeeID,
      Username,
      Password,
      Status
    } = request.body;

    // Validation
    if (!EmployeeID || !Username || !Password) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'EmployeeID, Username, and Password are required'
        }
      });
    }

    // Validate password length
    if (Password.length < 6) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Password too short',
          code: 'WEAK_PASSWORD',
          details: 'Password must be at least 6 characters'
        }
      });
    }

    // Check if employee exists
    const employeeBusinessId = await resolveEmployeeBusinessId(EmployeeID);
    if (!employeeBusinessId) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      });
    }

    const employee = await Employee.findOne({ ID: employeeBusinessId });
    if (!employee) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      });
    }

    // Check if username already exists
    const existingUsername = await AdminAccount.findOne({
      Username: Username.toLowerCase()
    });
    if (existingUsername) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Username already exists',
          code: 'DUPLICATE_USERNAME'
        }
      });
    }

    // Check if employee already has an admin account
    const existingAccount = await AdminAccount.findOne({ EmployeeID: employeeBusinessId });
    if (existingAccount) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Employee already has an admin account',
          code: 'DUPLICATE_ADMIN_ACCOUNT'
        }
      });
    }

    // Hash password
    const PasswordHash = await AdminAccount.hashPassword(Password);

    // Create admin account
    const adminAccount = new AdminAccount({
      EmployeeID: employeeBusinessId,
      Username: Username.toLowerCase(),
      PasswordHash,
      Status: Status ? Status.toUpperCase() : 'ACTIVE'
    });

    const savedAdminAccount = await adminAccount.save();

    // Populate employee details before returning.
    // NOTE: AdminAccount.EmployeeID is a BUSINESS ID string (EMP####), not an ObjectId,
    // so populating `EmployeeID` directly will attempt to cast EMP#### as ObjectId.
    // Use the virtual instead.
    await savedAdminAccount.populate({
      path: 'employee',
      select: 'ID EmployeeType Status PersonID',
      populate: {
        path: 'person',
        select: 'ID FullName Phone'
      }
    });

    response.status(201).json({
      success: true,
      data: savedAdminAccount,
      message: 'Admin account created successfully'
    });
  } catch (error) {
    console.error('Create admin account error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.message
        }
      });
    }

    // Handle duplicate errors
    if (error.code === 11000) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Duplicate admin account',
          code: 'DUPLICATE_ACCOUNT',
          details: error.message
        }
      });
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to create admin account',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/admin-accounts/:id
 * Update admin account
 */
adminAccountsRouter.put(
  '/:id',
  middleware.authRequired,
  middleware.requirePermissions(['PEOPLE.ACCESS_MANAGEMENT_HUB']),
  async (request, response) => {
  try {
    const {
      Username,
      Password,
      Status
    } = request.body;

    // Find admin account
    const adminAccount = await AdminAccount.findById(request.params.id);

    if (!adminAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Admin account not found',
          code: 'ADMIN_ACCOUNT_NOT_FOUND'
        }
      });
    }

    // Update username if provided
    if (Username !== undefined) {
      // Check if new username already exists (excluding current account)
      const existingUsername = await AdminAccount.findOne({
        _id: { $ne: adminAccount._id },
        Username: Username.toLowerCase()
      });

      if (existingUsername) {
        return response.status(409).json({
          success: false,
          error: {
            message: 'Username already exists',
            code: 'DUPLICATE_USERNAME'
          }
        });
      }

      adminAccount.Username = Username.toLowerCase();
    }

    // Update password if provided
    if (Password !== undefined) {
      // Validate password length
      if (Password.length < 6) {
        return response.status(400).json({
          success: false,
          error: {
            message: 'Password too short',
            code: 'WEAK_PASSWORD',
            details: 'Password must be at least 6 characters'
          }
        });
      }

      adminAccount.PasswordHash = await AdminAccount.hashPassword(Password);
    }

    // Update status
    if (Status !== undefined) {
      adminAccount.Status = Status.toUpperCase();
    }

    const updatedAdminAccount = await adminAccount.save();
    await updatedAdminAccount.populate({
      path: 'employee',
      select: 'ID EmployeeType Status PersonID',
      populate: {
        path: 'person',
        select: 'ID FullName Phone'
      }
    });

    response.json({
      success: true,
      data: updatedAdminAccount,
      message: 'Admin account updated successfully'
    });
  } catch (error) {
    console.error('Update admin account error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.message
        }
      });
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to update admin account',
        details: error.message
      }
    });
  }
  }
);

/**
 * DELETE /api/admin-accounts/:id
 * Delete admin account (set status to LOCKED)
 */
adminAccountsRouter.delete('/:id', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const adminAccount = await AdminAccount.findById(request.params.id);

    if (!adminAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Admin account not found',
          code: 'ADMIN_ACCOUNT_NOT_FOUND'
        }
      });
    }

    // Soft delete - set status to LOCKED
    adminAccount.Status = 'LOCKED';
    await adminAccount.save();

    response.json({
      success: true,
      message: 'Admin account locked successfully',
      data: {
        id: adminAccount._id,
        ID: adminAccount.ID
      }
    });
  } catch (error) {
    console.error('Delete admin account error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete admin account',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/admin-accounts/login
 * Admin login with username and password
 */
adminAccountsRouter.post('/login', async (request, response) => {
  try {
    const { Username, Password } = request.body;

    if (!Username || !Password) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    // Find admin account by username
    // NOTE: EmployeeID was migrated from Mongo ObjectId to business ID (EMP####).
    // Older documents may still contain legacy ObjectId strings and would fail
    // validation on save(). We avoid that during login and resolve the employee
    // business ID defensively.
    const adminAccount = await AdminAccount.findOne({
      Username: Username.toLowerCase()
    })
      .populate({
        // Prefer the new virtual relationship Employee.ID <-> AdminAccount.EmployeeID
        path: 'employee',
        select: 'ID Status PersonID',
        populate: {
          path: 'person',
          select: 'FullName'
        }
      });

    if (!adminAccount) {
      return response.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check account status
    if (adminAccount.Status !== 'ACTIVE') {
      return response.status(403).json({
        success: false,
        error: {
          message: 'Account is not active',
          code: 'ACCOUNT_NOT_ACTIVE',
          details: `Account status: ${adminAccount.Status}`
        }
      });
    }

    // Verify password
    const isPasswordValid = await adminAccount.comparePassword(Password);

    if (!isPasswordValid) {
      return response.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Update last login time WITHOUT triggering validation (legacy docs may have invalid EmployeeID)
    const lastLoginAt = new Date();
    await AdminAccount.updateOne(
      { _id: adminAccount._id },
      { $set: { LastLoginAt: lastLoginAt } }
    );

    // Reload so response returns updated time without requiring validation.
    adminAccount.LastLoginAt = lastLoginAt;

    // Resolve employee business ID for token payload.
    // - New: adminAccount.EmployeeID is EMP####
    // - Legacy: adminAccount.EmployeeID is ObjectId string
    // - Virtual populate: adminAccount.employee?.ID is EMP####
    const employeeBusinessId =
      adminAccount?.employee?.ID ||
      (await resolveEmployeeBusinessId(adminAccount.EmployeeID));

    // Resolve dynamic authz for JWT payload.
    const { roleIds, permissions } = employeeBusinessId
      ? await resolveAuthzForEmployee(employeeBusinessId)
      : { roleIds: [], permissions: [] };

    const adminAccountObjectId = adminAccount?._id ? String(adminAccount._id) : null;
    if (!adminAccountObjectId) {
      return response.status(500).json({
        success: false,
        error: {
          message: 'Failed to login',
          details: 'Admin account record is missing _id'
        }
      });
    }

    let token;
    try {
      token = signToken({
        type: 'admin',
        adminAccountId: adminAccountObjectId,
        username: adminAccount.Username,
        // Prefer business ID in token payload. Some older code reads employeeId,
        // so we keep it but now it equals the business ID.
        employeeId: employeeBusinessId,
        employeeBusinessId,
        roleIds,
        permissions
      });
    } catch (err) {
      return response.status(500).json({
        success: false,
        error: {
          message: 'Failed to login',
          details: err?.message || 'Failed to sign token',
          code: err?.code
        }
      });
    }

    response.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        ID: adminAccount.ID,
        Username: adminAccount.Username,
        // Return both the raw stored value and the resolved business id for robustness.
        EmployeeID: adminAccount.EmployeeID,
        EmployeeBusinessID: employeeBusinessId,
        LastLoginAt: adminAccount.LastLoginAt,
        // Provide populated documents so the client can render the employee/person name
        // without needing an extra request immediately after login.
        employee: adminAccount.employee || null
      }
    });
  } catch (error) {
    console.error('Admin login error:', {
      message: error?.message,
      stack: error?.stack,
      method: request?.method,
      path: request?.originalUrl || request?.path
    });
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to login',
        details: error.message
      }
    });
  }
});

module.exports = adminAccountsRouter;
