const mongoose = require('mongoose');

// Single-document collection storing global system configuration.
// We keep the field names close to the client payload for easy binding.
const systemConfigSchema = new mongoose.Schema(
  {
    // Parking lot capacity keyed by VehicleTypeID.
    // Shape: { [VehicleTypeID]: { total: number } }
    // Example: { "VTP0001": { total: 500 }, "VTP0002": { total: 1200 } }
    parkingCapacityByType: {
      type: Object,
      required: true,
      default: {}
    },

    // Legacy (v1) field kept for backward compatibility.
    // Shape: { cars, motorcycles, trucks, vans }
    // New code should prefer parkingCapacityByType.
    parkingCapacity: {
      type: Object,
      required: false,
      default: undefined
    },

    // Entry session settings
    entrySession: {
      freeMinutes: {
        type: Number,
        required: true,
        default: 15,
        min: 0,
        max: 24 * 60
      }
    }
  },
  { timestamps: { createdAt: 'CreatedAt', updatedAt: 'UpdatedAt' } }
);

systemConfigSchema.index({ UpdatedAt: -1 });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
