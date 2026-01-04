const customersRouter = require('express').Router();
const Customer = require('../models/customer');
const Person = require('../models/person');

/**
 * GET /api/customers
 * Get all customers with filtering and pagination
 * 
 * Query parameters:
 * - status: string - Filter by status
 * - search: string - Search by person name/phone
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
customersRouter.get('/', async (request, response) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.Status = status.toUpperCase();
    }

    // If search, first find matching persons
    let personIds = [];
    if (search) {
      const persons = await Person.find({
        $or: [
          { FullName: new RegExp(search, 'i') },
          { Phone: new RegExp(search, 'i') }
        ]
      }).select('_id');
      personIds = persons.map(p => p._id);
      filter.PersonID = { $in: personIds };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query with person population
    const customers = await Customer.find(filter)
      .populate('PersonID', 'ID FullName Phone Gender IsActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Customer.countDocuments(filter);

    response.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get customers',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/customers/:id
 * Get single customer by ID with person details
 */
customersRouter.get('/:id', async (request, response) => {
  try {
    const customer = await Customer.findById(request.params.id)
      .populate('PersonID', 'ID FullName Phone Gender IsActive');

    if (!customer) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get customer',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/customers
 * Create new customer (requires existing person)
 */
customersRouter.post('/', async (request, response) => {
  try {
    const {
      PersonID,
      RegisteredDay,
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

    // Check if person is already a customer
    const existingCustomer = await Customer.findOne({ PersonID });
    if (existingCustomer) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Person is already a customer',
          code: 'DUPLICATE_CUSTOMER'
        }
      });
    }

    // Create customer
    const customer = new Customer({
      PersonID,
      RegisteredDay: RegisteredDay || new Date(),
      Status: Status || 'ACTIVE'
    });

    const savedCustomer = await customer.save();

    // Populate person details before returning
    await savedCustomer.populate('PersonID', 'ID FullName Phone Gender IsActive');

    response.status(201).json({
      success: true,
      data: savedCustomer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Create customer error:', error);

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
        message: 'Failed to create customer',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer
 */
customersRouter.put('/:id', async (request, response) => {
  try {
    const {
      RegisteredDay,
      Status
    } = request.body;

    // Find customer
    const customer = await Customer.findById(request.params.id);

    if (!customer) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        }
      });
    }

    // Update fields (PersonID cannot be changed)
    if (RegisteredDay !== undefined) customer.RegisteredDay = RegisteredDay;
    if (Status !== undefined) customer.Status = Status.toUpperCase();

    const updatedCustomer = await customer.save();
    await updatedCustomer.populate('PersonID', 'ID FullName Phone Gender IsActive');

    response.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Update customer error:', error);

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
        message: 'Failed to update customer',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/customers/:id
 * Delete customer (soft delete - set status to INACTIVE)
 */
customersRouter.delete('/:id', async (request, response) => {
  try {
    const customer = await Customer.findById(request.params.id)
      .populate('PersonID', 'ID FullName');

    if (!customer) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        }
      });
    }

    // Soft delete - set status to INACTIVE
    customer.Status = 'INACTIVE';
    await customer.save();

    response.json({
      success: true,
      message: 'Customer deactivated successfully',
      data: {
        id: customer._id,
        ID: customer.ID,
        PersonID: customer.PersonID
      }
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete customer',
        details: error.message
      }
    });
  }
});

module.exports = customersRouter;
