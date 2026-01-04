const employeesRouter = require('express').Router();
const Employee = require('../models/employee');
const Person = require('../models/person');

/**
 * GET /api/employees
 * Get all employees with filtering and pagination
 * 
 * Query parameters:
 * - status: string - Filter by status
 * - employeeType: string - Filter by employee type
 * - search: string - Search by person name/phone
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
employeesRouter.get('/', async (request, response) => {
  try {
    const {
      status,
      employeeType,
      search,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.Status = status.toUpperCase();
    }

    if (employeeType) {
      filter.EmployeeType = employeeType.toUpperCase();
    }

    // If search, first find matching persons
    if (search) {
      const persons = await Person.find({
        $or: [
          { FullName: new RegExp(search, 'i') },
          { Phone: new RegExp(search, 'i') }
        ]
      }).select('_id');
      const personIds = persons.map(p => p._id);
      filter.PersonID = { $in: personIds };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query with person population
    const employees = await Employee.find(filter)
      .populate('PersonID', 'ID FullName Phone Gender IsActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Employee.countDocuments(filter);

    response.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get employees',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/employees/:id
 * Get single employee by ID with person details
 */
employeesRouter.get('/:id', async (request, response) => {
  try {
    const employee = await Employee.findById(request.params.id)
      .populate('PersonID', 'ID FullName Phone Gender IsActive');

    if (!employee) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get employee',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/employees
 * Create new employee (requires existing person)
 */
employeesRouter.post('/', async (request, response) => {
  try {
    const {
      PersonID,
      EmployeeType,
      HiredDate,
      Status
    } = request.body;

    // Validation
    if (!PersonID) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'PersonID is required'
        }
      });
    }

    // Check if person exists
    const person = await Person.findById(PersonID);
    if (!person) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Person not found',
          code: 'PERSON_NOT_FOUND'
        }
      });
    }

    // Check if person is already an employee
    const existingEmployee = await Employee.findOne({ PersonID });
    if (existingEmployee) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Person is already an employee',
          code: 'DUPLICATE_EMPLOYEE'
        }
      });
    }

    // Create employee
    const employee = new Employee({
      PersonID,
      EmployeeType: EmployeeType ? EmployeeType.toUpperCase() : 'STAFF',
      HiredDate: HiredDate || new Date(),
      Status: Status ? Status.toUpperCase() : 'ACTIVE'
    });

    const savedEmployee = await employee.save();

    // Populate person details before returning
    await savedEmployee.populate('PersonID', 'ID FullName Phone Gender IsActive');

    response.status(201).json({
      success: true,
      data: savedEmployee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Create employee error:', error);

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
        message: 'Failed to create employee',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/employees/:id
 * Update employee
 */
employeesRouter.put('/:id', async (request, response) => {
  try {
    const {
      EmployeeType,
      HiredDate,
      Status
    } = request.body;

    // Find employee
    const employee = await Employee.findById(request.params.id);

    if (!employee) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      });
    }

    // Update fields (PersonID cannot be changed)
    if (EmployeeType !== undefined) employee.EmployeeType = EmployeeType.toUpperCase();
    if (HiredDate !== undefined) employee.HiredDate = HiredDate;
    if (Status !== undefined) employee.Status = Status.toUpperCase();

    const updatedEmployee = await employee.save();
    await updatedEmployee.populate('PersonID', 'ID FullName Phone Gender IsActive');

    response.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);

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
        message: 'Failed to update employee',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/employees/:id
 * Delete employee (soft delete - set status to TERMINATED)
 */
employeesRouter.delete('/:id', async (request, response) => {
  try {
    const employee = await Employee.findById(request.params.id)
      .populate('PersonID', 'ID FullName');

    if (!employee) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        }
      });
    }

    // Soft delete - set status to TERMINATED
    employee.Status = 'TERMINATED';
    await employee.save();

    response.json({
      success: true,
      message: 'Employee terminated successfully',
      data: {
        id: employee._id,
        ID: employee.ID,
        PersonID: employee.PersonID
      }
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete employee',
        details: error.message
      }
    });
  }
});

module.exports = employeesRouter;
