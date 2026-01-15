const shiftsRouter = require('express').Router()

const Shift = require('../models/shift')

const isAdmin = (req) => req?.user?.type === 'admin'

const requireAdmin = (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({
      success: false,
      error: { message: 'forbidden', code: 'FORBIDDEN' }
    })
    return false
  }
  return true
}

const parseDateOnly = (value) => {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  // Treat date-only as local midnight for inclusive filtering
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * GET /api/shifts
 * Admin-only list for Manage Shifts.
 * Supports:
 *  - fromDate (YYYY-MM-DD)
 *  - toDate (YYYY-MM-DD)
 *  - search (matches Shift.ID or EmployeeID)
 *  - status (ACTIVE/COMPLETED)
 *  - page, limit
 */
shiftsRouter.get('/', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return

    const { fromDate, toDate, search, status, page = 1, limit = 20 } = req.query

    const filter = {}

    if (status) {
      filter.Status = String(status).trim().toUpperCase()
    }

    if (fromDate || toDate) {
      const from = parseDateOnly(fromDate)
      const to = parseDateOnly(toDate)
      filter.ShiftDate = {}
      if (from) filter.ShiftDate.$gte = from
      if (to) {
        // inclusive end-of-day
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        filter.ShiftDate.$lte = end
      }
      // If both were invalid, remove
      if (Object.keys(filter.ShiftDate).length === 0) delete filter.ShiftDate
    }

    if (search) {
      const q = String(search).trim().toUpperCase()
      // Business IDs, so regex is fine
      filter.$or = [
        { ID: new RegExp(q, 'i') },
        { EmployeeID: new RegExp(q, 'i') }
      ]
    }

    const pageN = Math.max(1, parseInt(page))
    const limitN = Math.min(200, Math.max(1, parseInt(limit)))
    const skip = (pageN - 1) * limitN

    const total = await Shift.countDocuments(filter)
    const items = await Shift.find(filter)
      .sort({ ShiftDate: -1, CheckInTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitN)
      .lean()

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageN,
          limit: limitN,
          total,
          pages: Math.ceil(total / limitN)
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GET_SHIFTS_ERROR' }
    })
  }
})

/**
 * GET /api/shifts/:shiftId
 * Admin-only get a single shift by business ID.
 */
shiftsRouter.get('/:shiftId', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return

    const shiftId = String(req.params.shiftId || '').trim()
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: { message: 'shiftId is required', code: 'MISSING_REQUIRED_FIELDS' }
      })
    }

    const shift = await Shift.findOne({ ID: shiftId }).lean()
    if (!shift) {
      return res.status(404).json({
        success: false,
        error: { message: 'Shift not found', code: 'SHIFT_NOT_FOUND' }
      })
    }

    res.json({ success: true, data: { item: shift } })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GET_SHIFT_ERROR' }
    })
  }
})

/**
 * POST /api/shifts/:shiftId/end
 * Admin-only action: mark shift completed.
 * - shiftId: business ID (e.g. SHF0001)
 */
shiftsRouter.post('/:shiftId/end', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return

    const shiftId = String(req.params.shiftId || '').trim()
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: { message: 'shiftId is required', code: 'MISSING_REQUIRED_FIELDS' }
      })
    }

    const shift = await Shift.findOne({ ID: shiftId })
    if (!shift) {
      return res.status(404).json({
        success: false,
        error: { message: 'Shift not found', code: 'SHIFT_NOT_FOUND' }
      })
    }

    if (String(shift.Status || '').toUpperCase() === 'COMPLETED') {
      return res.json({ success: true, data: shift.toJSON ? shift.toJSON() : shift })
    }

    shift.CheckOutTime = new Date()
    shift.Status = 'COMPLETED'
    await shift.save()

    res.json({ success: true, data: shift.toJSON ? shift.toJSON() : shift })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'END_SHIFT_ERROR' }
    })
  }
})

module.exports = shiftsRouter
