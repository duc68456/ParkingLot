const express = require('express')

const ShiftReport = require('../models/shiftReport')

const isAdmin = (req) => req?.user?.type === 'admin'
const isStaff = (req) => req?.user?.type === 'staff'

const requireAdminOrStaff = (req, res) => {
  if (!isAdmin(req) && !isStaff(req)) {
    res.status(403).json({
      success: false,
      error: { message: 'forbidden', code: 'FORBIDDEN' }
    })
    return false
  }
  return true
}

const shiftReportsRouter = express.Router()

/**
 * GET /api/shift-reports/by-shift/:shiftId
 * Returns ShiftReport by ShiftID (business id, e.g. SHF0007)
 */
shiftReportsRouter.get('/by-shift/:shiftId', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const shiftId = String(req.params.shiftId || '').trim().toUpperCase()
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: { message: 'shiftId is required', code: 'MISSING_SHIFT_ID' }
      })
    }

    const report = await ShiftReport.findOne({ ShiftID: shiftId }).lean()
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'ShiftReport not found', code: 'SHIFT_REPORT_NOT_FOUND' }
      })
    }

    return res.json({
      success: true,
      data: { item: report }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GET_SHIFT_REPORT_BY_SHIFT_ERROR' }
    })
  }
})

module.exports = shiftReportsRouter
