const staffAccountsRouter = require('express').Router();
const StaffAccount = require('../models/staffAccount');
const Employee = require('../models/employee');

/**
 * GET /api/staff-accounts
 * Get all staff accounts with filtering and pagination
 */
staffAccountsRouter.get('/', async (request, response) => {
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
staffAccountsRouter.get('/:id', async (request, response) => {
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
staffAccountsRouter.post('/', async (request, response) => {
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
    const employee = await Employee.findById(EmployeeID);
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
    const existingAccount = await StaffAccount.findOne({ EmployeeID });
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
      EmployeeID,
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
staffAccountsRouter.put('/:id', async (request, response) => {
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
 * DELETE /api/staff-accounts/:id
 * Delete staff account (hard delete or set status to LOCKED)
 */
staffAccountsRouter.delete('/:id', async (request, response) => {
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
    const { EmployeeID, PINCode } = request.body;

    if (!EmployeeID || !PINCode) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    // Find staff account by EmployeeID
    const staffAccount = await StaffAccount.findOne({ EmployeeID })
      .populate({
        path: 'EmployeeID',
        select: 'ID Status',
        populate: {
          path: 'PersonID',
          select: 'FullName'
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

    // Update last login time
    staffAccount.LastLoginAt = new Date();
    await staffAccount.save();

    response.json({
      success: true,
      message: 'PIN verified successfully',
      data: {
        ID: staffAccount.ID,
        EmployeeID: staffAccount.EmployeeID,
        LastLoginAt: staffAccount.LastLoginAt
      }
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
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
