const express = require('express')

const ShiftReportDetail = require('../models/shiftReportDetail')

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

const shiftReportDetailsRouter = express.Router()

/**
 * GET /api/shift-report-details?shiftReportId=SHR0001
 * Returns all ShiftReportDetail rows for a ShiftReportID (business id)
 */
shiftReportDetailsRouter.get('/', async (req, res) => {
  try {
    if (!requireAdminOrStaff(req, res)) return

    const shiftReportId = String(req.query.shiftReportId || '').trim().toUpperCase()
    if (!shiftReportId) {
      return res.status(400).json({
        success: false,
        error: { message: 'shiftReportId is required', code: 'MISSING_SHIFT_REPORT_ID' }
      })
    }

    const items = await ShiftReportDetail
      .find({ ShiftReportID: shiftReportId })
      .sort({ VehicleTypeID: 1 })
      .lean()

    return res.json({
      success: true,
      data: { items }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: 'GET_SHIFT_REPORT_DETAILS_ERROR' }
    })
  }
})

module.exports = shiftReportDetailsRouter
