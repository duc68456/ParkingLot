const personsRouter = require('express').Router();
const Person = require('../models/person');

/**
 * GET /api/persons
 * Get all persons with filtering and pagination
 * 
 * Query parameters:
 * - isActive: boolean - Filter by active status
 * - search: string - Search by name or phone
 * - gender: string - Filter by gender
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
personsRouter.get('/', async (request, response) => {
  try {
    const {
      isActive,
      search,
      gender,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (isActive !== undefined) {
      filter.IsActive = isActive === 'true';
    }

    if (gender) {
      filter.Gender = gender.toUpperCase();
    }

    if (search) {
      filter.$or = [
        { FullName: new RegExp(search, 'i') },
        { Phone: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const persons = await Person.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Person.countDocuments(filter);

    response.json({
      success: true,
      data: {
        persons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get persons error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get persons',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/persons/:id
 * Get single person by ID
 */
personsRouter.get('/:id', async (request, response) => {
  try {
    const person = await Person.findById(request.params.id);

    if (!person) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Person not found',
          code: 'PERSON_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: person
    });
  } catch (error) {
    console.error('Get person by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get person',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/persons
 * Create new person
 */
personsRouter.post('/', async (request, response) => {
  try {
    const {
      FullName,
      Phone,
      Gender,
      IsActive
    } = request.body;

    // Validation
    if (!FullName || !Phone || !Gender) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'FullName, Phone, and Gender are required'
        }
      });
    }

    // Check if phone already exists
    const existingPerson = await Person.findOne({ Phone });

    if (existingPerson) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Phone number already exists',
          code: 'DUPLICATE_PHONE'
        }
      });
    }

    // Create person
    const person = new Person({
      FullName,
      Phone,
      Gender: Gender.toUpperCase(),
      IsActive: IsActive !== undefined ? IsActive : true
    });

    const savedPerson = await person.save();

    response.status(201).json({
      success: true,
      data: savedPerson,
      message: 'Person created successfully'
    });
  } catch (error) {
    console.error('Create person error:', error);

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
        message: 'Failed to create person',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/persons/:id
 * Update person
 */
personsRouter.put('/:id', async (request, response) => {
  try {
    const {
      FullName,
      Phone,
      Gender,
      IsActive
    } = request.body;

    // Find person
    const person = await Person.findById(request.params.id);

    if (!person) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Person not found',
          code: 'PERSON_NOT_FOUND'
        }
      });
    }

    // Check if new phone already exists (excluding current person)
    if (Phone && Phone !== person.Phone) {
      const existingPerson = await Person.findOne({
        _id: { $ne: person._id },
        Phone
      });

      if (existingPerson) {
        return response.status(409).json({
          success: false,
          error: {
            message: 'Phone number already exists',
            code: 'DUPLICATE_PHONE'
          }
        });
      }
    }

    // Update fields
    if (FullName !== undefined) person.FullName = FullName;
    if (Phone !== undefined) person.Phone = Phone;
    if (Gender !== undefined) person.Gender = Gender.toUpperCase();
    if (IsActive !== undefined) person.IsActive = IsActive;

    const updatedPerson = await person.save();

    response.json({
      success: true,
      data: updatedPerson,
      message: 'Person updated successfully'
    });
  } catch (error) {
    console.error('Update person error:', error);

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
        message: 'Failed to update person',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/persons/:id
 * Delete person (soft delete - set isActive to false)
 */
personsRouter.delete('/:id', async (request, response) => {
  try {
    const person = await Person.findById(request.params.id);

    if (!person) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Person not found',
          code: 'PERSON_NOT_FOUND'
        }
      });
    }

    // Soft delete - set IsActive to false
    person.IsActive = false;
    await person.save();

    response.json({
      success: true,
      message: 'Person deactivated successfully',
      data: {
        id: person._id,
        ID: person.ID,
        FullName: person.FullName
      }
    });
  } catch (error) {
    console.error('Delete person error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete person',
        details: error.message
      }
    });
  }
});

module.exports = personsRouter;
