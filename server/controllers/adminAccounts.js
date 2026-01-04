const adminAccountsRouter = require('express').Router();
const AdminAccount = require('../models/adminAccount');
const Employee = require('../models/employee');

/**
 * GET /api/admin-accounts
 * Get all admin accounts with filtering and pagination
 */
adminAccountsRouter.get('/', async (request, response) => {
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
    const adminAccounts = await AdminAccount.find(filter)
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
adminAccountsRouter.get('/:id', async (request, response) => {
  try {
    const adminAccount = await AdminAccount.findById(request.params.id)
      .populate({
        path: 'EmployeeID',
        select: 'ID EmployeeType Status HiredDate',
        populate: {
          path: 'PersonID',
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
 */
adminAccountsRouter.post('/', async (request, response) => {
  try {
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
    const existingAccount = await AdminAccount.findOne({ EmployeeID });
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
      EmployeeID,
      Username: Username.toLowerCase(),
      PasswordHash,
      Status: Status ? Status.toUpperCase() : 'ACTIVE'
    });

    const savedAdminAccount = await adminAccount.save();

    // Populate employee details before returning
    await savedAdminAccount.populate({
      path: 'EmployeeID',
      select: 'ID EmployeeType Status',
      populate: {
        path: 'PersonID',
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
adminAccountsRouter.put('/:id', async (request, response) => {
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
      path: 'EmployeeID',
      select: 'ID EmployeeType Status',
      populate: {
        path: 'PersonID',
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
});

/**
 * DELETE /api/admin-accounts/:id
 * Delete admin account (set status to LOCKED)
 */
adminAccountsRouter.delete('/:id', async (request, response) => {
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
    const adminAccount = await AdminAccount.findOne({
      Username: Username.toLowerCase()
    }).populate({
      path: 'EmployeeID',
      select: 'ID Status',
      populate: {
        path: 'PersonID',
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

    // Update last login time
    adminAccount.LastLoginAt = new Date();
    await adminAccount.save();

    response.json({
      success: true,
      message: 'Login successful',
      data: {
        ID: adminAccount.ID,
        Username: adminAccount.Username,
        EmployeeID: adminAccount.EmployeeID,
        LastLoginAt: adminAccount.LastLoginAt
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
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
