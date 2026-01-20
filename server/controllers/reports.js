const reportsRouter = require('express').Router()
const mongoose = require('mongoose')

const EntrySession = require('../models/entrySession')
const Employee = require('../models/employee')
const Shift = require('../models/shift')
const VehicleType = require('../models/vehicleType')
const CardCategory = require('../models/cardCategory')
const Card = require('../models/card')
const Person = require('../models/person')

const middleware = require('../utils/middleware')

// Option A: allow staff/admin access based on permissions.
// All report endpoints require REPORTS.VIEW.
reportsRouter.use(middleware.requirePermissions(['REPORTS.VIEW']))

// Helper: Parse date range from query
const parseDateRange = (fromDate, toDate) => {
  const now = new Date()
  let from = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  let to = toDate ? new Date(toDate) : now

  // Set time to start/end of day
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

// Helper: Get quick range
const getQuickRange = (quickRange) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (quickRange) {
    case 'today':
      return { from: today, to: now }
    case 'week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return { from: startOfWeek, to: now }
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: startOfMonth, to: now }
    }
    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return { from: startOfYear, to: now }
    }
    default:
      return null
  }
}

// GET /api/reports/overview - KPIs for General Overview
reportsRouter.get('/overview', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Get all EXITED sessions in range
    const sessions = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: from, $lte: to }
    }).select('FinalFee').lean()

    const totalTransactions = sessions.length
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.FinalFee || 0), 0)
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Current vehicles in parking
    const vehiclesInParking = await EntrySession.countDocuments({ Status: 'IN_PARKING' })

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalRevenue,
        avgTransaction,
        vehiclesInParking,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports overview error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/revenue-trend - Revenue by day/week/month
reportsRouter.get('/revenue-trend', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange, period = 'day' } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Determine grouping format
    let groupFormat
    switch (period) {
      case 'week':
        groupFormat = { $isoWeek: '$ExitTime' }
        break
      case 'month':
        groupFormat = { $month: '$ExitTime' }
        break
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$ExitTime' } }
    }

    const pipeline = [
      {
        $match: {
          Status: 'EXITED',
          ExitTime: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$FinalFee' },
          transactions: { $sum: 1 },
          year: { $first: { $year: '$ExitTime' } }
        }
      },
      { $sort: { year: 1, _id: 1 } }
    ]

    const results = await EntrySession.aggregate(pipeline)

    // Calculate trend (% change from previous)
    const trendData = results.map((item, index) => {
      const prevRevenue = index > 0 ? results[index - 1].revenue : null
      const trend = prevRevenue !== null && prevRevenue > 0
        ? ((item.revenue - prevRevenue) / prevRevenue) * 100
        : null

      return {
        label: String(item._id),
        revenue: item.revenue,
        transactions: item.transactions,
        trend: trend !== null ? Math.round(trend * 10) / 10 : null
      }
    })

    res.json({
      success: true,
      data: {
        items: trendData,
        period,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports revenue-trend error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/staff - Staff performance
reportsRouter.get('/staff', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Get all employees with person info
    const employees = await Employee.find({ Status: 'ACTIVE' })
      .populate('person')
      .lean()

    // Get shifts in range
    const shifts = await Shift.find({
      ShiftDate: { $gte: from, $lte: to }
    }).lean()

    // Get entry sessions processed by each employee
    const entrySessions = await EntrySession.find({
      EntryTime: { $gte: from, $lte: to }
    }).select('ProcessedEntryBy FinalFee').lean()

    // Get exit sessions processed by each employee
    const exitSessions = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: from, $lte: to }
    }).select('ProcessedExitBy FinalFee').lean()

    // Build staff stats
    const staffStats = employees.map(emp => {
      const empShifts = shifts.filter(s => s.EmployeeID === emp.ID)
      const entries = entrySessions.filter(s => s.ProcessedEntryBy === emp.ID)
      const exits = exitSessions.filter(s => s.ProcessedExitBy === emp.ID)
      const revenue = exits.reduce((sum, s) => sum + (s.FinalFee || 0), 0)
      const avgShift = empShifts.length > 0 ? revenue / empShifts.length : 0

      return {
        id: emp.ID,
        name: emp.person?.FullName || 'Unknown',
        employeeType: emp.EmployeeType,
        shifts: empShifts.length,
        entries: entries.length,
        exits: exits.length,
        revenue,
        avgShift
      }
    })

    // KPIs
    const totalStaff = employees.length
    const totalShifts = shifts.length
    const totalProcessed = entrySessions.length + exitSessions.length
    const totalRevenue = exitSessions.reduce((sum, s) => sum + (s.FinalFee || 0), 0)

    // Highlights
    const sorted = [...staffStats].filter(s => s.shifts > 0)
    const topRevenue = sorted.sort((a, b) => b.revenue - a.revenue)[0] || null
    const mostEntries = sorted.sort((a, b) => b.entries - a.entries)[0] || null
    const bestAvg = sorted.sort((a, b) => b.avgShift - a.avgShift)[0] || null

    res.json({
      success: true,
      data: {
        kpis: { totalStaff, totalShifts, totalProcessed, totalRevenue },
        staff: staffStats,
        highlights: { topRevenue, mostEntries, bestAvg },
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports staff error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/detailed/vehicle-types - Revenue by vehicle type
reportsRouter.get('/detailed/vehicle-types', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Get all vehicle types
    const vehicleTypes = await VehicleType.find({ IsActive: true }).lean()

    // Aggregate sessions by vehicle type
    const pipeline = [
      {
        $match: {
          Status: 'EXITED',
          ExitTime: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: '$VehicleTypeID',
          vehicles: { $sum: 1 },
          total: { $sum: '$FinalFee' }
        }
      }
    ]

    const results = await EntrySession.aggregate(pipeline)

    // Map to vehicle type names
    const vehicleStats = vehicleTypes.map(vt => {
      const stat = results.find(r => r._id === vt.VehicleTypeID) || { vehicles: 0, total: 0 }
      return {
        id: vt.VehicleTypeID,
        title: vt.Name,
        vehicles: stat.vehicles,
        total: stat.total,
        average: stat.vehicles > 0 ? Math.round(stat.total / stat.vehicles) : 0
      }
    })

    res.json({
      success: true,
      data: {
        items: vehicleStats,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports vehicle-types error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/detailed/card-categories - Revenue by card category
reportsRouter.get('/detailed/card-categories', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Get all card categories
    const cardCategories = await CardCategory.find({ IsActive: true }).lean()

    // Get sessions with card info
    const sessions = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: from, $lte: to }
    }).select('CardID FinalFee').lean()

    // Get cards to map to categories
    const cardIds = [...new Set(sessions.map(s => s.CardID))]
    const cards = await Card.find({ CardID: { $in: cardIds } }).select('CardID CardCategoryID').lean()
    const cardMap = new Map(cards.map(c => [c.CardID, c.CardCategoryID]))

    // Aggregate by category
    const categoryStats = {}
    for (const session of sessions) {
      const categoryId = cardMap.get(session.CardID) || 'UNKNOWN'
      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = { transactions: 0, revenue: 0 }
      }
      categoryStats[categoryId].transactions++
      categoryStats[categoryId].revenue += session.FinalFee || 0
    }

    const totalRevenue = Object.values(categoryStats).reduce((sum, s) => sum + s.revenue, 0)

    const items = cardCategories.map(cc => {
      const stat = categoryStats[cc.ID] || { transactions: 0, revenue: 0 }
      return {
        id: cc.ID,
        type: cc.Name,
        transactions: stat.transactions,
        revenue: stat.revenue,
        percentage: totalRevenue > 0 ? Math.round((stat.revenue / totalRevenue) * 1000) / 10 : 0
      }
    })

    res.json({
      success: true,
      data: {
        items,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports card-categories error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/detailed/hourly - Entry/exit by hour
reportsRouter.get('/detailed/hourly', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Define hour buckets
    const buckets = [
      { id: '6-9', label: '6-9 AM', start: 6, end: 9 },
      { id: '9-12', label: '9-12 PM', start: 9, end: 12 },
      { id: '12-15', label: '12-3 PM', start: 12, end: 15 },
      { id: '15-18', label: '3-6 PM', start: 15, end: 18 },
      { id: '18-21', label: '6-9 PM', start: 18, end: 21 },
      { id: '21-24', label: '9-12 AM', start: 21, end: 24 }
    ]

    // Get all sessions in range
    const entrySessions = await EntrySession.find({
      EntryTime: { $gte: from, $lte: to }
    }).select('EntryTime').lean()

    const exitSessions = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: from, $lte: to }
    }).select('ExitTime FinalFee').lean()

    // Count by bucket
    const items = buckets.map(bucket => {
      const entries = entrySessions.filter(s => {
        const hour = new Date(s.EntryTime).getHours()
        return hour >= bucket.start && hour < bucket.end
      }).length

      const exitsInBucket = exitSessions.filter(s => {
        const hour = new Date(s.ExitTime).getHours()
        return hour >= bucket.start && hour < bucket.end
      })

      return {
        id: bucket.id,
        period: bucket.label,
        entries,
        exits: exitsInBucket.length,
        revenue: exitsInBucket.reduce((sum, s) => sum + (s.FinalFee || 0), 0)
      }
    })

    res.json({
      success: true,
      data: {
        items,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports hourly error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// GET /api/reports/time-period - Revenue comparison with trends
reportsRouter.get('/time-period', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange, period = 'day' } = req.query

    // Reuse revenue-trend logic but with more detail
    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    let groupFormat, labelFormat
    switch (period) {
      case 'week':
        groupFormat = { $isoWeek: '$ExitTime' }
        labelFormat = 'Week'
        break
      case 'month':
        groupFormat = { $month: '$ExitTime' }
        labelFormat = 'Month'
        break
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$ExitTime' } }
        labelFormat = 'Day'
    }

    const pipeline = [
      {
        $match: {
          Status: 'EXITED',
          ExitTime: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$FinalFee' },
          transactions: { $sum: 1 },
          entries: { $sum: 1 },
          year: { $first: { $year: '$ExitTime' } },
          month: { $first: { $month: '$ExitTime' } },
          day: { $first: { $dayOfMonth: '$ExitTime' } }
        }
      },
      { $sort: { year: 1, month: 1, day: 1, _id: 1 } }
    ]

    const results = await EntrySession.aggregate(pipeline)

    // Format labels and calculate trends
    const items = results.map((item, index) => {
      const prevRevenue = index > 0 ? results[index - 1].revenue : null
      const trend = prevRevenue !== null && prevRevenue > 0
        ? ((item.revenue - prevRevenue) / prevRevenue) * 100
        : null

      let label = String(item._id)
      if (period === 'day' && item._id) {
        const date = new Date(item._id)
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (period === 'week') {
        label = `Week ${item._id}`
      } else if (period === 'month') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        label = months[item._id - 1] || `Month ${item._id}`
      }

      return {
        id: String(item._id),
        label,
        revenue: item.revenue,
        transactions: item.transactions,
        trend: trend !== null ? Math.round(trend * 10) / 10 : null
      }
    })

    res.json({
      success: true,
      data: {
        items,
        period,
        periodLabel: labelFormat,
        dateRange: { from, to }
      }
    })
  } catch (error) {
    console.error('Reports time-period error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

module.exports = reportsRouter
