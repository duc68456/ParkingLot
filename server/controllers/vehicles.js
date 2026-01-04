const vehiclesRouter = require('express').Router()
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')

// GET all vehicles with filtering and pagination
vehiclesRouter.get('/', async (req, res) => {
  try {
    const { status, isActive, vehicleTypeId, search, page = 1, limit = 20 } = req.query
    const filter = {}

    if (status) {
      filter.Status = status.toUpperCase()
    }

    if (isActive !== undefined) {
      filter.IsActive = isActive === 'true'
    }

    if (vehicleTypeId) {
      filter.VehicleTypeID = vehicleTypeId
    }

    if (search) {
      filter.$or = [
        { PlateNumber: { $regex: search, $options: 'i' } },
        { VehicleID: { $regex: search, $options: 'i' } },
        { Color: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await Vehicle.countDocuments(filter)

    const vehicles = await Vehicle
      .find(filter)
      .populate('VehicleTypeID', 'VehicleTypeID Name')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        items: vehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_VEHICLES_ERROR'
      }
    })
  }
})

// GET single vehicle by ID
vehiclesRouter.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle
      .findById(req.params.id)
      .populate('VehicleTypeID', 'VehicleTypeID Name')

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Vehicle not found',
          code: 'VEHICLE_NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: vehicle
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_VEHICLE_ERROR'
      }
    })
  }
})

// POST - Create new vehicle
vehiclesRouter.post('/', async (req, res) => {
  try {
    const { PlateNumber, VehicleTypeID, Color, Status } = req.body

    // Validate required fields
    if (!PlateNumber || !VehicleTypeID || !Color) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'PlateNumber, VehicleTypeID, and Color are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      })
    }

    // Check if VehicleType exists
    const vehicleType = await VehicleType.findOne({ VehicleTypeID })
    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'VehicleType not found',
          code: 'VEHICLE_TYPE_NOT_FOUND'
        }
      })
    }

    // Check if plate number already exists
    const existingVehicle = await Vehicle.findOne({
      PlateNumber: PlateNumber.toUpperCase()
    })
    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Vehicle with this plate number already exists',
          code: 'DUPLICATE_PLATE_NUMBER'
        }
      })
    }

    const vehicle = new Vehicle({
      PlateNumber: PlateNumber.toUpperCase(),
      VehicleTypeID,
      Color,
      Status: Status || 'ACTIVE'
    })

    const savedVehicle = await vehicle.save()
    const populatedVehicle = await Vehicle
      .findById(savedVehicle._id)
      .populate('VehicleTypeID', 'VehicleTypeID Name')

    res.status(201).json({
      success: true,
      data: populatedVehicle,
      message: 'Vehicle created successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'CREATE_VEHICLE_ERROR'
      }
    })
  }
})

// PUT - Update vehicle
vehiclesRouter.put('/:id', async (req, res) => {
  try {
    const { PlateNumber, VehicleTypeID, Color, Status, IsActive } = req.body

    const vehicle = await Vehicle.findById(req.params.id)
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Vehicle not found',
          code: 'VEHICLE_NOT_FOUND'
        }
      })
    }

    // If updating plate number, check for duplicates
    if (PlateNumber && PlateNumber.toUpperCase() !== vehicle.PlateNumber) {
      const existingVehicle = await Vehicle.findOne({
        PlateNumber: PlateNumber.toUpperCase(),
        _id: { $ne: req.params.id }
      })
      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Vehicle with this plate number already exists',
            code: 'DUPLICATE_PLATE_NUMBER'
          }
        })
      }
      vehicle.PlateNumber = PlateNumber.toUpperCase()
    }

    // If updating VehicleTypeID, verify it exists
    if (VehicleTypeID && VehicleTypeID !== vehicle.VehicleTypeID) {
      const vehicleType = await VehicleType.findOne({ VehicleTypeID })
      if (!vehicleType) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'VehicleType not found',
            code: 'VEHICLE_TYPE_NOT_FOUND'
          }
        })
      }
      vehicle.VehicleTypeID = VehicleTypeID
    }

    if (Color !== undefined) vehicle.Color = Color
    if (Status !== undefined) vehicle.Status = Status
    if (IsActive !== undefined) vehicle.IsActive = IsActive

    const updatedVehicle = await vehicle.save()
    const populatedVehicle = await Vehicle
      .findById(updatedVehicle._id)
      .populate('VehicleTypeID', 'VehicleTypeID Name')

    res.json({
      success: true,
      data: populatedVehicle,
      message: 'Vehicle updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'UPDATE_VEHICLE_ERROR'
      }
    })
  }
})

// DELETE - Soft delete vehicle
vehiclesRouter.delete('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Vehicle not found',
          code: 'VEHICLE_NOT_FOUND'
        }
      })
    }

    vehicle.IsActive = false
    vehicle.Status = 'BLOCKED'
    await vehicle.save()

    res.json({
      success: true,
      message: 'Vehicle deactivated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_VEHICLE_ERROR'
      }
    })
  }
})

module.exports = vehiclesRouter
