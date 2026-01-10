const staffAccountsRouter = require('express').Router();
const StaffAccount = require('../models/staffAccount');
const Employee = require('../models/employee');
const { signToken } = require('../utils/auth');
const middleware = require('../utils/middleware');

const generatePin = () => String(Math.floor(100000 + Math.random() * 900000));

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

const generateUniquePin = async (maxAttempts = 25) => {
  for (let i = 0; i < maxAttempts; i += 1) {
    const pin = generatePin();
    // PINCode is stored hashed, but schema has unique:true.
    // We can only cheaply check collisions by looking for an exact match on stored value,
    // which won't work because values are hashed. So we instead handle uniqueness by:
    // 1) trying to save; 2) if it hits duplicate key (11000) retry.
    // Still, we return pin here and let caller handle save/dup retry.
    return pin;
  }
  throw new Error('Failed to generate unique PIN');
}

/**
 * GET /api/staff-accounts
 * Get all staff accounts with filtering and pagination
 */
staffAccountsRouter.get('/', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const {
      status,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.Status = status.toUpperCase();
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query with employee population
    const staffAccounts = await StaffAccount.find(filter)
      .populate({
        path: 'EmployeeID',
        select: 'ID EmployeeType Status',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone'
        }
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await StaffAccount.countDocuments(filter);

    response.json({
      success: true,
      data: {
        staffAccounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get staff accounts error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get staff accounts',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/staff-accounts/:id
 * Get single staff account by ID
 */
staffAccountsRouter.get('/:id', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const staffAccount = await StaffAccount.findById(request.params.id)
      .populate({
        path: 'EmployeeID',
        select: 'ID EmployeeType Status HiredDate',
        populate: {
          path: 'PersonID',
          select: 'ID FullName Phone Gender'
        }
      });

    if (!staffAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Staff account not found',
          code: 'STAFF_ACCOUNT_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: staffAccount
    });
  } catch (error) {
    console.error('Get staff account by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get staff account',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/staff-accounts
 * Create new staff account
 */
staffAccountsRouter.post('/', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const {
      EmployeeID,
      PINCode,
      Status
    } = request.body;

    // Validation
    if (!EmployeeID || !PINCode) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'EmployeeID and PINCode are required'
        }
      });
    }

    // Validate PIN code length (before hashing)
    if (PINCode.length < 4 || PINCode.length > 8) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Invalid PIN code length',
          code: 'INVALID_PIN_LENGTH',
          details: 'PIN code must be 4-8 characters'
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

    // Check if employee already has a staff account
    const existingAccount = await StaffAccount.findOne({ EmployeeID: employeeBusinessId });
    if (existingAccount) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Employee already has a staff account',
          code: 'DUPLICATE_STAFF_ACCOUNT'
        }
      });
    }

    // Create staff account
    const staffAccount = new StaffAccount({
      EmployeeID: employeeBusinessId,
      PINCode, // Will be hashed in pre-save hook
      Status: Status ? Status.toUpperCase() : 'ACTIVE'
    });

    const savedStaffAccount = await staffAccount.save();

    // Populate employee details before returning
    await savedStaffAccount.populate({
      path: 'EmployeeID',
      select: 'ID EmployeeType Status',
      populate: {
        path: 'PersonID',
        select: 'ID FullName Phone'
      }
    });

    response.status(201).json({
      success: true,
      data: savedStaffAccount,
      message: 'Staff account created successfully'
    });
  } catch (error) {
    console.error('Create staff account error:', error);

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
          message: 'Duplicate staff account',
          code: 'DUPLICATE_ACCOUNT',
          details: error.message
        }
      });
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to create staff account',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/staff-accounts/:id
 * Update staff account
 */
staffAccountsRouter.put('/:id', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const {
      PINCode,
      Status
    } = request.body;

    // Find staff account
    const staffAccount = await StaffAccount.findById(request.params.id);

    if (!staffAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Staff account not found',
          code: 'STAFF_ACCOUNT_NOT_FOUND'
        }
      });
    }

    // Update fields (EmployeeID cannot be changed)
    if (PINCode !== undefined) {
      // Validate PIN code length
      if (PINCode.length < 4 || PINCode.length > 8) {
        return response.status(400).json({
          success: false,
          error: {
            message: 'Invalid PIN code length',
            code: 'INVALID_PIN_LENGTH',
            details: 'PIN code must be 4-8 characters'
          }
        });
      }
      staffAccount.PINCode = PINCode; // Will be hashed in pre-save hook
    }

    if (Status !== undefined) staffAccount.Status = Status.toUpperCase();

    const updatedStaffAccount = await staffAccount.save();
    await updatedStaffAccount.populate({
      path: 'EmployeeID',
      select: 'ID EmployeeType Status',
      populate: {
        path: 'PersonID',
        select: 'ID FullName Phone'
      }
    });

    response.json({
      success: true,
      data: updatedStaffAccount,
      message: 'Staff account updated successfully'
    });
  } catch (error) {
    console.error('Update staff account error:', error);

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
        message: 'Failed to update staff account',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/staff-accounts/by-employee/:employeeBusinessId/generate-pin
 * Generates a new 6-digit PIN for a staff employee.
 * - Admin-only
 * - Creates the StaffAccount if missing
 * - Stores hashed PIN (via model pre-save hook)
 * - Returns the plaintext PIN once (for admin to share/copy)
 */
staffAccountsRouter.post('/by-employee/:employeeBusinessId/generate-pin', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const employeeBusinessId = String(request.params.employeeBusinessId || '').trim().toUpperCase();
    if (!employeeBusinessId) {
      return response.status(400).json({
        success: false,
        error: { message: 'Employee business ID is required', code: 'MISSING_EMPLOYEE_ID' }
      });
    }

    const employee = await Employee.findOne({ ID: employeeBusinessId });
    if (!employee) {
      return response.status(404).json({
        success: false,
        error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
      });
    }

    const employeeType = String(employee.EmployeeType || '').toUpperCase();
    if (employeeType !== 'STAFF' && employeeType !== 'GATE_STAFF') {
      return response.status(400).json({
        success: false,
        error: { message: 'Employee is not a staff account type', code: 'INVALID_EMPLOYEE_TYPE' }
      });
    }

    let staffAccount = await StaffAccount.findOne({ EmployeeID: employeeBusinessId });

    // Generate a unique PIN with retry on duplicate key.
    let newPin = null;
    let lastSaveError = null;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      newPin = await generateUniquePin();

      try {
        if (!staffAccount) {
          staffAccount = new StaffAccount({
            EmployeeID: employeeBusinessId,
            PINCode: newPin,
            Status: 'ACTIVE'
          });
        } else {
          staffAccount.PINCode = newPin;
          // ensure active
          if (String(staffAccount.Status || '').toUpperCase() !== 'ACTIVE') {
            staffAccount.Status = 'ACTIVE';
          }
        }

        await staffAccount.save();
        lastSaveError = null;
        break;
      } catch (err) {
        // Duplicate key (unique PINCode) => regenerate and retry.
        if (err?.code === 11000) {
          lastSaveError = err;
          continue;
        }
        throw err;
      }
    }

    if (lastSaveError) {
      return response.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate a unique PIN',
          code: 'PIN_GENERATION_FAILED'
        }
      })
    }

    return response.json({
      success: true,
      message: 'PIN code regenerated successfully',
      data: {
        employeeBusinessId,
        staffAccountId: staffAccount._id.toString(),
        pin: newPin
      }
    });
  } catch (error) {
    console.error('Generate new staff PIN error:', error);
    return response.status(500).json({
      success: false,
      error: { message: 'Failed to generate new PIN', details: error.message }
    });
  }
});

/**
 * DELETE /api/staff-accounts/:id
 * Delete staff account (hard delete or set status to LOCKED)
 */
staffAccountsRouter.delete('/:id', middleware.authRequired, middleware.adminOnly, async (request, response) => {
  try {
    const staffAccount = await StaffAccount.findById(request.params.id);

    if (!staffAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Staff account not found',
          code: 'STAFF_ACCOUNT_NOT_FOUND'
        }
      });
    }

    // Soft delete - set status to LOCKED
    staffAccount.Status = 'LOCKED';
    await staffAccount.save();

    response.json({
      success: true,
      message: 'Staff account locked successfully',
      data: {
        id: staffAccount._id,
        ID: staffAccount.ID
      }
    });
  } catch (error) {
    console.error('Delete staff account error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete staff account',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/staff-accounts/verify-pin
 * Verify staff PIN code for authentication
 */
staffAccountsRouter.post('/verify-pin', async (request, response) => {
  try {
    // Staff login is PIN-only.
    const { PINCode } = request.body;

    if (!PINCode) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    // PIN-only login: scan ACTIVE accounts and compare.
    // Because PINCode is hashed, we can't query by PIN directly.
    // For small staff counts this is acceptable; for large counts, consider storing a keyed hash.
    let staffAccount = null;
    const activeAccounts = await StaffAccount.find({ Status: 'ACTIVE' })
      .populate({
        path: 'employee',
        select: 'ID Status PersonID',
        populate: {
          path: 'person',
          select: 'FullName'
        }
      });

    for (const acc of activeAccounts) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await acc.comparePin(PINCode)
      if (ok) {
        staffAccount = acc
        break
      }
    }

    if (!staffAccount) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Staff account not found',
          code: 'STAFF_ACCOUNT_NOT_FOUND'
        }
      });
    }

    // Check account status
    if (staffAccount.Status !== 'ACTIVE') {
      return response.status(403).json({
        success: false,
        error: {
          message: 'Account is not active',
          code: 'ACCOUNT_NOT_ACTIVE',
          details: `Account status: ${staffAccount.Status}`
        }
      });
    }

    // Verify PIN
    const isPinValid = await staffAccount.comparePin(PINCode);

    if (!isPinValid) {
      return response.status(401).json({
        success: false,
        error: {
          message: 'Invalid PIN code',
          code: 'INVALID_PIN'
        }
      });
    }

    // Update last login time.
    // IMPORTANT: Don't call staffAccount.save() here.
    // The hashed PINCode is longer than 8 chars, and schema maxLength validation would fail.
    await StaffAccount.updateOne(
      { _id: staffAccount._id },
      { $set: { LastLoginAt: new Date() } }
    );

    // StaffAccount.EmployeeID is an employee business ID string (EMP####).
    const token = signToken({
      type: 'staff',
      staffAccountId: staffAccount._id.toString(),
      employeeId: staffAccount.EmployeeID,
      employeeBusinessId: staffAccount.EmployeeID
    })

    response.json({
      success: true,
      message: 'PIN verified successfully',
      data: {
        token,
        ID: staffAccount.ID,
        EmployeeID: staffAccount.EmployeeID,
        LastLoginAt: staffAccount.LastLoginAt
      }
    });
  } catch (error) {
    console.error('Verify PIN error:', error);

    if (error?.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.message
        }
      })
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify PIN',
        details: error.message
      }
    });
  }
});

module.exports = staffAccountsRouter;
