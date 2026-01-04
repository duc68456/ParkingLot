const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema({
  VehicleTypeID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^VTP\d{4}$/, 'Vehicle type ID must follow format VTP0001']
    // Auto-generated in pre-save hook
  },

  Name: {
    type: String,
    required: [true, 'Vehicle type name is required'],
    unique: true,
    trim: true,
    maxlength: [30, 'Vehicle type name cannot exceed 30 characters']
  },

  IsActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Indexes for faster queries
vehicleTypeSchema.index({ VehicleTypeID: 1 });
vehicleTypeSchema.index({ Name: 1 });
vehicleTypeSchema.index({ IsActive: 1 });

/**
 * Pre-save hook: Auto-generate VehicleTypeID
 * Format: VTP[SEQUENCE]
 * Example: VTP0001
 */
vehicleTypeSchema.pre('save', async function (next) {
  if (this.isNew && !this.VehicleTypeID) {
    try {
      const VehicleType = mongoose.model('VehicleType');

      // Find the last vehicle type ID
      const lastVehicleType = await VehicleType
        .findOne({}, { VehicleTypeID: 1 })
        .sort({ VehicleTypeID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastVehicleType && lastVehicleType.VehicleTypeID) {
        // Extract the sequence number from the last vehicle type ID
        const match = lastVehicleType.VehicleTypeID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      // Generate new vehicle type ID with 4-digit padding
      this.VehicleTypeID = `VTP${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

vehicleTypeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('VehicleType', vehicleTypeSchema);
