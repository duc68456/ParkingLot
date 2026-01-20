const vehiclesRouter = require('express').Router()
const Vehicle = require('../models/vehicle')
const VehicleType = require('../models/vehicleType')
const Subscription = require('../models/subscription')
const Customer = require('../models/customer')
const Person = require('../models/person')
const middleware = require('../utils/middleware')

const getOwnerFromSubscription = async (vehicleId) => {
  if (!vehicleId) return null

  const now = new Date()
  const subscription = await Subscription.findOne({
    VehicleID: vehicleId,
    IsSuspended: false,
    StartDate: { $lte: now },
    EndDate: { $gte: now }
  }).lean()

  console.log(`[getOwnerFromSubscription] VehicleID: ${vehicleId}, Found subscription:`, subscription)

  if (!subscription || !subscription.CustomerID) return null

  const customer = await Customer.findOne({ ID: subscription.CustomerID }).lean()
  console.log(`[getOwnerFromSubscription] CustomerID: ${subscription.CustomerID}, Found customer:`, customer)

  if (!customer || !customer.PersonID) return null

  const person = await Person.findOne({ ID: customer.PersonID }).lean()
  console.log(`[getOwnerFromSubscription] PersonID: ${customer.PersonID}, Found person:`, person)

  if (!person) return null

  return {
    ownerId: customer.ID,
    ownerName: person.FullName,
    ownerType: 'Customer',
    ownerPhone: person.Phone
  }
}

const attachVehicleType = async (vehicleDoc) => {
  if (!vehicleDoc) return vehicleDoc
  const v = vehicleDoc.toJSON ? vehicleDoc.toJSON() : vehicleDoc
  const vehicleType = await VehicleType
    .findOne({ VehicleTypeID: v.VehicleTypeID })
    .select('VehicleTypeID Name')
    .lean()

  return {
    ...v,
    VehicleType: vehicleType || null
  }
}

const attachVehicleTypes = async (vehicleDocs) => {
  const ids = Array.from(
    new Set(
      (vehicleDocs || [])
        .map(d => (d?.VehicleTypeID || d?.toJSON?.()?.VehicleTypeID))
        .filter(Boolean)
        .map(id => String(id).toUpperCase())
    )
  )

  if (ids.length === 0) {
    return (vehicleDocs || []).map(d => ({
      ...(d.toJSON ? d.toJSON() : d),
      VehicleType: null
    }))
  }

  const types = await VehicleType
    .find({ VehicleTypeID: { $in: ids } })
    .select('VehicleTypeID Name')
    .lean()

  const byId = new Map(types.map(t => [t.VehicleTypeID, t]))

  return (vehicleDocs || []).map(d => {
    const v = d.toJSON ? d.toJSON() : d
    return {
      ...v,
      VehicleType: byId.get(String(v.VehicleTypeID).toUpperCase()) || null
    }
  })
}

// GET all vehicles with filtering and pagination
vehiclesRouter.get('/', middleware.requirePermissions(['VEHICLES.VIEW']), async (req, res) => {
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
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })

    const vehiclesWithTypes = await attachVehicleTypes(vehicles)

    // Add owner info for each vehicle
    const vehiclesWithOwners = await Promise.all(
      vehiclesWithTypes.map(async (v) => {
        const ownerInfo = await getOwnerFromSubscription(v.VehicleID)
        return {
          ...v,
          ...ownerInfo
        }
      })
    )

    res.json({
      success: true,
      data: {
        items: vehiclesWithOwners,
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
vehiclesRouter.get('/:id', middleware.requirePermissions(['VEHICLES.VIEW']), async (req, res) => {
  try {
    const vehicle = await Vehicle
      .findById(req.params.id)

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Vehicle not found',
          code: 'VEHICLE_NOT_FOUND'
        }
      })
    }

    const vehicleWithType = await attachVehicleType(vehicle)
    const ownerInfo = await getOwnerFromSubscription(vehicleWithType.VehicleID)

    res.json({
      success: true,
      data: {
        ...vehicleWithType,
        ...ownerInfo
      }
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
vehiclesRouter.post('/', middleware.requirePermissions(['VEHICLES.FULL']), async (req, res) => {
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
    const vehicleDoc = await Vehicle.findById(savedVehicle._id)
    const populatedVehicle = await attachVehicleType(vehicleDoc)

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
vehiclesRouter.put('/:id', middleware.requirePermissions(['VEHICLES.FULL']), async (req, res) => {
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
    const vehicleDoc = await Vehicle.findById(updatedVehicle._id)
    const populatedVehicle = await attachVehicleType(vehicleDoc)

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

// DELETE - Update vehicle status (soft delete)
vehiclesRouter.delete('/:id', middleware.requirePermissions(['VEHICLES.FULL']), async (req, res) => {
  try {
    const { status } = req.body;

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

    // Update status - accept from body or default to Inactive
    const newStatus = status ? String(status) : 'Inactive';
    const allowedStatuses = ['Active', 'Inactive', 'BLOCKED'];

    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: `Status: ${newStatus} is not a valid status`
        }
      })
    }

    vehicle.IsActive = newStatus === 'Active';
    vehicle.Status = newStatus === 'Active' ? 'ACTIVE' : 'BLOCKED';
    await vehicle.save()

    res.json({
      success: true,
      message: 'Vehicle status updated successfully',
      data: {
        id: vehicle._id,
        VehicleID: vehicle.VehicleID,
        IsActive: vehicle.IsActive,
        Status: vehicle.Status
      }
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
