const systemConfigRouter = require('express').Router();

const middleware = require('../utils/middleware');
const { PERMISSIONS } = require('../utils/permissions');

const SystemConfig = require('../models/systemConfig');
const VehicleType = require('../models/vehicleType');

const normalize = (doc) => {
  if (!doc) return null;
  return {
    // Primary canonical storage (VehicleTypeID keyed)
    parkingCapacityByType: doc.parkingCapacityByType || {},
    // Legacy field (may be undefined)
    parkingCapacity: doc.parkingCapacity || {},
    entrySession: {
      freeMinutes: doc.entrySession?.freeMinutes ?? 15
    },
    UpdatedAt: doc.UpdatedAt,
    CreatedAt: doc.CreatedAt
  };
};

async function getOrCreateDefault() {
  const existing = await SystemConfig.findOne({}).sort({ UpdatedAt: -1 }).lean();
  if (existing) return existing;

  // Seed defaults based on currently active vehicle types.
  const vehicleTypes = await VehicleType.find({ IsActive: true }).lean();
  const byType = {};
  for (const vt of vehicleTypes) {
    byType[String(vt.VehicleTypeID).toUpperCase()] = { total: 100 };
  }

  const created = await new SystemConfig({
    parkingCapacityByType: byType,
    entrySession: { freeMinutes: 15 }
  }).save();

  return created.toJSON ? created.toJSON() : created;
}

// GET /api/system-config
// Requires SYSTEM_CONFIG.VIEW or SYSTEM_CONFIG.FULL
systemConfigRouter.get(
  '/',
  middleware.authRequired,
  middleware.requirePermissions([PERMISSIONS.SYSTEM_CONFIG_VIEW]),
  async (req, res) => {
    try {
      const cfg = await getOrCreateDefault();

      // Always return vehicle-type aware capacities so UI can match DB.
      const vehicleTypes = await VehicleType.find({ IsActive: true }).lean();
      const byType = cfg?.parkingCapacityByType || {};

      const capacities = vehicleTypes.map((vt) => {
        const id = String(vt.VehicleTypeID || '').toUpperCase();
        const totalRaw = byType?.[id]?.total;
        const total = Number(totalRaw);
        return {
          id,
          name: vt.Name,
          total: Number.isFinite(total) && total >= 0 ? total : 100
        };
      });

      const totalCapacity = capacities.reduce((sum, c) => sum + (c.total || 0), 0);

      return res.json({
        success: true,
        data: {
          config: normalize(cfg),
          capacities,
          totalCapacity
        }
      });
    } catch (error) {
      console.error('Get system config error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load system config', details: error.message }
      });
    }
  }
);

// PUT /api/system-config
// Requires SYSTEM_CONFIG.FULL
systemConfigRouter.put(
  '/',
  middleware.authRequired,
  middleware.requirePermissions([PERMISSIONS.SYSTEM_CONFIG_FULL]),
  async (req, res) => {
    try {
      const body = req.body || {};

      // New payload: parkingCapacityByType: { [VehicleTypeID]: { total } }
      // Also support legacy payload: parkingCapacity: { cars, motorcycles, trucks, vans }
      const parkingCapacityByType = body.parkingCapacityByType && typeof body.parkingCapacityByType === 'object'
        ? body.parkingCapacityByType
        : null;

      const legacyParkingCapacity = body.parkingCapacity && typeof body.parkingCapacity === 'object'
        ? body.parkingCapacity
        : null;

      const freeMinutesRaw = body.entrySession?.freeMinutes;
      const freeMinutes = Number.isFinite(Number(freeMinutesRaw)) ? Number(freeMinutesRaw) : 15;

      if (freeMinutes < 0 || freeMinutes > 24 * 60) {
        return res.status(400).json({
          success: false,
          error: { message: 'freeMinutes must be between 0 and 1440', code: 'VALIDATION_ERROR' }
        });
      }

      const cfg = await getOrCreateDefault();

      let nextByType = cfg?.parkingCapacityByType || {};

      if (parkingCapacityByType) {
        // Validate/sanitize totals
        const sanitized = {};
        for (const [k, v] of Object.entries(parkingCapacityByType)) {
          const id = String(k || '').trim().toUpperCase();
          if (!id) continue;
          const total = Number(v?.total);
          if (!Number.isFinite(total) || total < 0) continue;
          sanitized[id] = { total };
        }
        nextByType = sanitized;
      } else if (legacyParkingCapacity) {
        // Best-effort: map legacy keys (cars/motorcycles/trucks/vans) onto the first matching active vehicle types by name.
        // This keeps older clients from breaking, but the UI should move to VehicleTypeID-keyed values.
        const vehicleTypes = await VehicleType.find({ IsActive: true }).lean();
        const byName = {};
        for (const vt of vehicleTypes) {
          byName[String(vt.Name || '').toLowerCase()] = String(vt.VehicleTypeID || '').toUpperCase();
        }

        const mapped = { ...nextByType };

        const assignByIncludes = (includesList, value) => {
          if (!Number.isFinite(Number(value)) || Number(value) < 0) return;
          const val = Number(value);
          const hit = Object.entries(byName).find(([name]) => includesList.some((s) => name.includes(s)));
          if (!hit) return;
          const id = hit[1];
          mapped[id] = { total: val };
        };

        assignByIncludes(['car', 'xe hơi', 'oto', 'ô tô'], legacyParkingCapacity.cars);
        assignByIncludes(['motor', 'xe máy', 'bike'], legacyParkingCapacity.motorcycles);
        assignByIncludes(['truck', 'xe tải'], legacyParkingCapacity.trucks);
        assignByIncludes(['van', 'bus', 'xe khách'], legacyParkingCapacity.vans);

        nextByType = mapped;
      }

      const updated = await SystemConfig.findByIdAndUpdate(
        cfg._id,
        {
          $set: {
            parkingCapacityByType: nextByType,
            entrySession: { freeMinutes }
          }
        },
        { new: true }
      ).lean();

      return res.json({ success: true, data: { config: normalize(updated) } });
    } catch (error) {
      console.error('Update system config error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update system config', details: error.message }
      });
    }
  }
);

module.exports = systemConfigRouter;
