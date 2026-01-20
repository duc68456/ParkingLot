const reportsRouter = require('express').Router()
const mongoose = require('mongoose')

const EntrySession = require('../models/entrySession')
const Employee = require('../models/employee')
const Shift = require('../models/shift')
const VehicleType = require('../models/vehicleType')
const CardCategory = require('../models/cardCategory')
const Card = require('../models/card')
const Person = require('../models/person')
const Subscription = require('../models/subscription')
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const CardPurchaseDetail = require('../models/cardPurchaseDetail')

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
// Always returns fixed time intervals for consistent chart display
reportsRouter.get('/revenue-trend', async (req, res) => {
  try {
    const { fromDate, toDate, quickRange, period } = req.query

    let dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
    const { from, to } = dateRange

    // Determine grouping format based on quickRange or explicit period
    const effectivePeriod = period || (quickRange === 'today' ? 'hour' : quickRange === 'year' ? 'month' : 'day')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Generate fixed time slots based on quickRange
    let fixedSlots = []
    if (quickRange === 'today') {
      // Today: every hour (0-23)
      for (let h = 0; h < 24; h++) {
        fixedSlots.push({ key: h, label: `${h.toString().padStart(2, '0')}:00`, revenue: 0, transactions: 0 })
      }
    } else if (quickRange === 'year') {
      // Year: 12 months
      for (let m = 1; m <= 12; m++) {
        fixedSlots.push({ key: m, label: months[m - 1], revenue: 0, transactions: 0 })
      }
    } else if (quickRange === 'week') {
      // Week: 7 days
      const startOfWeek = new Date(from)
      for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + d)
        const dateStr = date.toISOString().split('T')[0]
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        fixedSlots.push({ key: dateStr, label, revenue: 0, transactions: 0 })
      }
    } else if (quickRange === 'month') {
      // Month: all days in current month
      const year = from.getFullYear()
      const month = from.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        const dateStr = date.toISOString().split('T')[0]
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        fixedSlots.push({ key: dateStr, label, revenue: 0, transactions: 0 })
      }
    } else {
      // Default: last 7 days
      for (let d = 6; d >= 0; d--) {
        const date = new Date()
        date.setDate(date.getDate() - d)
        const dateStr = date.toISOString().split('T')[0]
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        fixedSlots.push({ key: dateStr, label, revenue: 0, transactions: 0 })
      }
    }

    // Determine grouping for aggregation
    let groupFormat
    if (quickRange === 'today') {
      groupFormat = { $hour: '$ExitTime' }
    } else if (quickRange === 'year') {
      groupFormat = { $month: '$ExitTime' }
    } else {
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
          transactions: { $sum: 1 }
        }
      }
    ]

    const results = await EntrySession.aggregate(pipeline)

    // Create lookup map from results
    const dataMap = new Map()
    for (const item of results) {
      dataMap.set(String(item._id), item)
    }

    // Merge data into fixed slots
    const trendData = fixedSlots.map((slot, index) => {
      const data = dataMap.get(String(slot.key))
      const revenue = data ? data.revenue : 0
      const transactions = data ? data.transactions : 0

      // Calculate trend
      const prevRevenue = index > 0 ? fixedSlots[index - 1].revenue : null
      let trend = null
      if (prevRevenue !== null && prevRevenue > 0) {
        trend = Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10
      }

      // Update slot with actual data for trend calculation
      slot.revenue = revenue
      slot.transactions = transactions

      return {
        label: slot.label,
        revenue,
        transactions,
        trend
      }
    })

    res.json({
      success: true,
      data: {
        items: trendData,
        period: effectivePeriod,
        quickRange,
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
    const employees = await Employee.find({ Status: 'ACTIVE', EmployeeType: 'STAFF' })
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
    }).filter(s => s.revenue > 0)

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

    // Helper to normalize strings for comparison (visitor check)
    const isVisitor = (name) => {
      const s = String(name || '').toLowerCase()
      return s.includes('visitor') || s.includes('vãng lai')
    }

    const categoryStats = {}
    // Initialize stats
    cardCategories.forEach(cc => {
      categoryStats[cc.ID] = { transactions: 0, revenue: 0, type: cc.Name, isVisitor: isVisitor(cc.Name) }
    })

    // 1. Calculate VISITOR Revenue (from EntrySessions)
    // Only fetch sessions for visitor cards if we can filter by card category via lookup,
    // or just fetch all exited sessions and filter in memory if volume allows.
    // For scalability, let's try to filter by visitor categories if possible.
    const visitorCategoryIds = cardCategories.filter(c => isVisitor(c.Name)).map(c => c.ID)

    if (visitorCategoryIds.length > 0) {
      // Find cards belonging to visitor categories (if needed, but usually Visitor cards are linked to Visitor Category)
      // Aggregate EntrySessions -> Lookup Card -> Match CardCategory in visitorCategoryIds
      const visitorPipeline = [
        {
          $match: {
            Status: 'EXITED',
            ExitTime: { $gte: from, $lte: to }
          }
        },
        {
          $lookup: {
            from: 'cards', // collection name
            localField: 'CardID',
            foreignField: 'CardID',
            as: 'card'
          }
        },
        { $unwind: '$card' }, // Unwind to check category
        {
          $match: {
            'card.CardCategoryID': { $in: visitorCategoryIds }
          }
        },
        {
          $group: {
            _id: '$card.CardCategoryID',
            revenue: { $sum: '$FinalFee' },
            transactions: { $sum: 1 }
          }
        }
      ]

      const visitorResults = await EntrySession.aggregate(visitorPipeline)
      visitorResults.forEach(r => {
        if (categoryStats[r._id]) {
          categoryStats[r._id].revenue += r.revenue
          categoryStats[r._id].transactions += r.transactions
        }
      })
    }

    // 2. Calculate NON-VISITOR Revenue (Subscriptions + Invoices)
    const nonVisitorCategories = cardCategories.filter(c => !isVisitor(c.Name))
    const nonVisitorCategoryIds = nonVisitorCategories.map(c => c.ID)

    if (nonVisitorCategoryIds.length > 0) {
      // A. Subscriptions
      // We need to know which category a subscription belongs to.
      // Subscription -> Card -> CardCategory.
      const subPipeline = [
        {
          $match: {
            // Using createdAt as "revenue date". Could use StartDate depending on business logic.
            createdAt: { $gte: from, $lte: to }
          }
        },
        {
          $lookup: {
            from: 'cards',
            localField: 'CardID',
            foreignField: 'CardID',
            as: 'card'
          }
        },
        { $unwind: '$card' },
        {
          $match: {
            'card.CardCategoryID': { $in: nonVisitorCategoryIds }
          }
        },
        {
          $group: {
            _id: '$card.CardCategoryID',
            revenue: { $sum: '$PricePaid' },
            transactions: { $sum: 1 }
          }
        }
      ]

      const subResults = await Subscription.aggregate(subPipeline)
      subResults.forEach(r => {
        if (categoryStats[r._id]) {
          categoryStats[r._id].revenue += r.revenue
          categoryStats[r._id].transactions += r.transactions
        }
      })

      // B. Card Purchase Invoices (Detailed)
      // Filter details by Invoice Date and Category
      // We need to look up the Invoice to check the date first (or filter details then lookup invoice?).
      // Better: Match Invoices in range -> Lookup Details -> Unwind -> Match non-visitor category -> Group
      const invoicePipeline = [
        {
          $match: {
            InvoiceDate: { $gte: from, $lte: to },
            Status: 'COMPLETED' // Only count completed invoices? Or all? User said "invoice turns". Usually completed sales.
          }
        },
        {
          $lookup: {
            from: 'cardpurchasedetails', // Check exact collection name in mongo usually lowercase plural
            localField: 'ID',
            foreignField: 'InvoiceID',
            as: 'details'
          }
        },
        { $unwind: '$details' },
        {
          $match: {
            'details.CardCategoryID': { $in: nonVisitorCategoryIds }
          }
        },
        {
          $group: {
            _id: '$details.CardCategoryID',
            // Revenue = quantity * unit price
            revenue: { $sum: { $multiply: ['$details.Quantity', '$details.UnitPrice'] } },
            transactions: { $sum: '$details.Quantity' } // Counting number of cards sold as "transactions" (turns)
          }
        }
      ]

      const invoiceResults = await CardPurchaseInvoice.aggregate(invoicePipeline)
      invoiceResults.forEach(r => {
        if (categoryStats[r._id]) {
          categoryStats[r._id].revenue += r.revenue
          categoryStats[r._id].transactions += r.transactions
        }
      })
    }

    const totalRevenue = Object.values(categoryStats).reduce((sum, s) => sum + s.revenue, 0)

    const items = Object.values(categoryStats).map(stat => ({
      id: cardCategories.find(c => c.Name === stat.type)?.ID || 'UNKNOWN',
      type: stat.type,
      transactions: stat.transactions,
      revenue: stat.revenue,
      percentage: totalRevenue > 0 ? Math.round((stat.revenue / totalRevenue) * 1000) / 10 : 0
    }))

    // Sort by revenue desc
    items.sort((a, b) => b.revenue - a.revenue)

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
    const { fromDate, toDate, quickRange, period = 'day', month, year } = req.query

    // Determine Date Range
    let dateRange
    let groupFormat
    let labelFormat
    let allKeys = [] // To fill gaps

    // Logic for "By Week" with specific month/year check (Custom 4-week buckets)
    if (period === 'week' && month && year) {
      const y = parseInt(year)
      const m = parseInt(month) - 1
      const from = new Date(y, m, 1)
      const to = new Date(y, m + 1, 0, 23, 59, 59, 999)
      dateRange = { from, to }

      // Custom Grouping for 4 Weeks
      // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-End
      groupFormat = {
        $switch: {
          branches: [
            { case: { $lte: [{ $dayOfMonth: '$ExitTime' }, 7] }, then: 1 },
            { case: { $lte: [{ $dayOfMonth: '$ExitTime' }, 14] }, then: 2 },
            { case: { $lte: [{ $dayOfMonth: '$ExitTime' }, 21] }, then: 3 },
          ],
          default: 4
        }
      }
      labelFormat = 'Week'
      allKeys = [1, 2, 3, 4]
    } else {
      dateRange = quickRange ? getQuickRange(quickRange) : parseDateRange(fromDate, toDate)
      const { from, to } = dateRange

      if (period === 'day') {
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$ExitTime' } }
        labelFormat = 'Day'

        // Generate all dates in range
        let current = new Date(from)
        while (current <= to) {
          allKeys.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
      } else if (period === 'month') {
        groupFormat = {
          y: { $year: '$ExitTime' },
          m: { $month: '$ExitTime' }
        }
        labelFormat = 'Month'

        // Generate all months in range
        let current = new Date(from)
        current.setDate(1) // Start of month
        const target = new Date(to)
        target.setDate(1) // Start of target month

        while (current <= target) {
          allKeys.push({ y: current.getFullYear(), m: current.getMonth() + 1 })
          current.setMonth(current.getMonth() + 1)
        }
      } else if (period === 'week') {
        // General week range - simpler isoWeek
        groupFormat = { $isoWeek: '$ExitTime' }
        labelFormat = 'Week'
        // Not filling gaps for general week range as it's complex with years
      }
    }

    const { from, to } = dateRange

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
          firstDate: { $min: '$ExitTime' }
        }
      },
      { $sort: { _id: 1 } }
    ]

    const results = await EntrySession.aggregate(pipeline)

    // Map results to a dictionary for easy lookup
    const resultMap = {}
    results.forEach(r => {
      // Stringify key for object lookup
      const k = (typeof r._id === 'object' && r._id !== null) ? `${r._id.y}-${r._id.m}` : String(r._id)
      resultMap[k] = r
    })

    // Build final items filling gaps
    let items = []

    if (allKeys.length > 0) {
      items = allKeys.map((key, index) => {
        let lookupKey = key
        if (typeof key === 'object') lookupKey = `${key.y}-${key.m}`
        else lookupKey = String(key)

        const data = resultMap[lookupKey] || { revenue: 0, transactions: 0 }

        let label = ''
        if (period === 'day') {
          const [y, m, d] = lookupKey.split('-')
          const date = new Date(y, m - 1, d)
          label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        } else if (period === 'week') {
          // key is 1, 2, 3, 4
          label = `Week ${key}`
        } else if (period === 'month') {
          // key is {y, m}
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          label = `${months[key.m - 1]} ${key.y}`
        }

        // Calculate trend relative to PREVIOUS item in this generated list
        const prevItem = index > 0 ? items[index - 1] : null
        let trend = null
        if (prevItem && prevItem.revenue > 0) {
          trend = ((data.revenue - prevItem.revenue) / prevItem.revenue) * 100
        }

        return {
          id: String(index),
          label,
          revenue: data.revenue,
          transactions: data.transactions,
          trend: trend !== null ? Math.round(trend * 10) / 10 : null
        }
      })
    } else {
      // Fallback for cases without gap filling
      items = results.map((item, index) => {
        let label = `Week ${item._id}`
        return {
          id: String(index),
          label,
          revenue: item.revenue,
          transactions: item.transactions,
          trend: null
        }
      })
    }

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
