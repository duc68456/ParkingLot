const vehicleTypesRouter = require('express').Router();
const VehicleType = require('../models/vehicleType');

/**
 * GET /api/vehicle-types
 * Get all vehicle types with filtering and pagination
 * 
 * Query parameters:
 * - isActive: boolean - Filter by active status
 * - search: string - Search by name
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
vehicleTypesRouter.get('/', async (request, response) => {
  try {
    const {
      isActive,
      search,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (isActive !== undefined) {
      filter.IsActive = isActive === 'true';
    }

    if (search) {
      filter.Name = new RegExp(search, 'i');
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const vehicleTypes = await VehicleType.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await VehicleType.countDocuments(filter);

    response.json({
      success: true,
      data: {
        vehicleTypes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get vehicle types error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get vehicle types',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/vehicle-types/:id
 * Get single vehicle type by ID
 */
vehicleTypesRouter.get('/:id', async (request, response) => {
  try {
    const vehicleType = await VehicleType.findById(request.params.id);

    if (!vehicleType) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Vehicle type not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: vehicleType
    });
  } catch (error) {
    console.error('Get vehicle type by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get vehicle type',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/vehicle-types
 * Create new vehicle type
 */
vehicleTypesRouter.post('/', async (request, response) => {
  try {
    const {
      Name,
      IsActive
    } = request.body;

    // Validation
    if (!Name) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'Name is required'
        }
      });
    }

    // Check if vehicle type name already exists
    const existingVehicleType = await VehicleType.findOne({
      Name: { $regex: new RegExp(`^${Name}$`, 'i') }
    });

    if (existingVehicleType) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Vehicle type name already exists',
          code: 'DUPLICATE_VEHICLE_TYPE_NAME'
        }
      });
    }

    // Create vehicle type
    const vehicleType = new VehicleType({
      Name,
      IsActive: IsActive !== undefined ? IsActive : true
    });

    const savedVehicleType = await vehicleType.save();

    response.status(201).json({
      success: true,
      data: savedVehicleType,
      message: 'Vehicle type created successfully'
    });
  } catch (error) {
    console.error('Create vehicle type error:', error);

    // Handle duplicate vehicle type code
    if (error.code === 11000) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Vehicle type already exists',
          code: 'DUPLICATE_VEHICLE_TYPE',
          details: error.message
        }
      });
    }

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
        message: 'Failed to create vehicle type',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/vehicle-types/:id
 * Update vehicle type
 */
vehicleTypesRouter.put('/:id', async (request, response) => {
  try {
    const {
      Name,
      IsActive
    } = request.body;

    // Find vehicle type
    const vehicleType = await VehicleType.findById(request.params.id);

    if (!vehicleType) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Vehicle type not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      });
    }

    // Check if new name already exists (excluding current vehicle type)
    if (Name && Name !== vehicleType.Name) {
      const existingVehicleType = await VehicleType.findOne({
        _id: { $ne: vehicleType._id },
        Name: { $regex: new RegExp(`^${Name}$`, 'i') }
      });

      if (existingVehicleType) {
        return response.status(409).json({
          success: false,
          error: {
            message: 'Vehicle type name already exists',
            code: 'DUPLICATE_VEHICLE_TYPE_NAME'
          }
        });
      }
    }

    // Update fields
    if (Name !== undefined) vehicleType.Name = Name;
    if (IsActive !== undefined) vehicleType.IsActive = IsActive;

    const updatedVehicleType = await vehicleType.save();

    response.json({
      success: true,
      data: updatedVehicleType,
      message: 'Vehicle type updated successfully'
    });
  } catch (error) {
    console.error('Update vehicle type error:', error);

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
        message: 'Failed to update vehicle type',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/vehicle-types/:id
 * Delete vehicle type
 * Note: Can only delete inactive vehicle types
 */
vehicleTypesRouter.delete('/:id', async (request, response) => {
  try {
    const vehicleType = await VehicleType.findById(request.params.id);

    if (!vehicleType) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Vehicle type not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      });
    }

    // Only allow deletion of inactive vehicle types
    if (vehicleType.IsActive !== false) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete active vehicle type',
          code: 'VEHICLE_TYPE_IS_ACTIVE',
          details: 'Vehicle type must be deactivated before deletion'
        }
      });
    }

    // Hard delete - remove from database
    await VehicleType.findByIdAndDelete(request.params.id);

    response.json({
      success: true,
      message: 'Vehicle type deleted successfully',
      data: {
        id: vehicleType._id,
        VehicleTypeID: vehicleType.VehicleTypeID,
        Name: vehicleType.Name
      }
    });
  } catch (error) {
    console.error('Delete vehicle type error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete vehicle type',
        details: error.message
      }
    });
  }
});

module.exports = vehicleTypesRouter;
