const mongoose = require('mongoose')

const vehicleSchema = new mongoose.Schema({
  VehicleID: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^VEH\d{4}$/
  },
  PlateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 30,
    uppercase: true
  },
  VehicleTypeID: {
    type: String,
    required: true,
    ref: 'VehicleType'
  },
  Color: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20
  },
  Status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'BLOCKED', 'LOST'],
    default: 'ACTIVE'
  },
  IsActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Auto-generate VehicleID before saving
vehicleSchema.pre('save', async function (next) {
  if (!this.VehicleID) {
    const lastVehicle = await this.constructor.findOne({}, {}, { sort: { 'VehicleID': -1 } })

    if (lastVehicle && lastVehicle.VehicleID) {
      const lastNumber = parseInt(lastVehicle.VehicleID.substring(3))
      const nextNumber = lastNumber + 1
      this.VehicleID = `VEH${nextNumber.toString().padStart(4, '0')}`
    } else {
      this.VehicleID = 'VEH0001'
    }
  }
  next()
})

// Configure toJSON to exclude sensitive fields
vehicleSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Vehicle', vehicleSchema)
