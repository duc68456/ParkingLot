const dashboardRouter = require('express').Router()
const EntrySession = require('../models/entrySession')
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const Shift = require('../models/shift')
const VehicleType = require('../models/vehicleType')
const Card = require('../models/card')
const Customer = require('../models/customer')
const Employee = require('../models/employee')
const Person = require('../models/person')

/**
 * GET /api/dashboard/stats
 * Returns key statistics for the dashboard
 */
dashboardRouter.get('/stats', async (request, response, next) => {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // 1. Today's Revenue
    const exitedSessionsToday = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: startOfToday, $lte: endOfToday }
    }).select('FinalFee')

    const invoicesToday = await CardPurchaseInvoice.find({
      InvoiceDate: { $gte: startOfToday, $lte: endOfToday },
      Status: 'COMPLETED'
    }).select('TotalAmount')

    const revenueFromSessions = exitedSessionsToday.reduce((sum, session) => sum + (session.FinalFee || 0), 0)
    const revenueFromInvoices = invoicesToday.reduce((sum, invoice) => sum + (invoice.TotalAmount || 0), 0)
    const todayRevenue = revenueFromSessions + revenueFromInvoices

    // Calculate yesterday's revenue for trend
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const endOfYesterday = new Date(endOfToday)
    endOfYesterday.setDate(endOfYesterday.getDate() - 1)

    const exitedSessionsYesterday = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: startOfYesterday, $lte: endOfYesterday }
    }).select('FinalFee')

    const invoicesYesterday = await CardPurchaseInvoice.find({
      InvoiceDate: { $gte: startOfYesterday, $lte: endOfYesterday },
      Status: 'COMPLETED'
    }).select('TotalAmount')

    const yesterdayRevenue =
      exitedSessionsYesterday.reduce((sum, s) => sum + (s.FinalFee || 0), 0) +
      invoicesYesterday.reduce((sum, i) => sum + (i.TotalAmount || 0), 0)

    const revenueTrend = yesterdayRevenue > 0
      ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
      : todayRevenue > 0 ? 100.0 : 0

    // 2. Vehicles In Lot
    const vehiclesInLot = await EntrySession.countDocuments({
      Status: 'IN_PARKING'
    })

    // Get total capacity from vehicle types (assuming max capacity per type is stored or estimated)
    const vehicleTypes = await VehicleType.find({})
    // For demo: assume 2000 total spots (500 cars + 1200 motorcycles + 150 trucks + 200 vans)
    const totalCapacity = 2050
    const capacityPercent = totalCapacity > 0 ? Math.round((vehiclesInLot / totalCapacity) * 100) : 0

    // 3. Active Staff
    const activeStaff = await Shift.countDocuments({
      Status: 'IN_PROGRESS',
      ShiftDate: { $gte: startOfToday, $lte: endOfToday }
    })

    // 4. Today's Entries
    const todayEntries = await EntrySession.countDocuments({
      EntryTime: { $gte: startOfToday, $lte: endOfToday }
    })

    // Calculate yesterday's entries for trend
    const yesterdayEntries = await EntrySession.countDocuments({
      EntryTime: { $gte: startOfYesterday, $lte: endOfYesterday }
    })

    const entriesTrend = yesterdayEntries > 0
      ? (((todayEntries - yesterdayEntries) / yesterdayEntries) * 100).toFixed(1)
      : todayEntries > 0 ? 100.0 : 0

    response.json({
      success: true,
      data: {
        revenue: {
          value: todayRevenue,
          trend: parseFloat(revenueTrend),
          trendDirection: revenueTrend >= 0 ? 'up' : 'down'
        },
        vehiclesInLot: {
          value: vehiclesInLot,
          capacityPercent
        },
        activeStaff: {
          value: activeStaff
        },
        todayEntries: {
          value: todayEntries,
          trend: parseFloat(entriesTrend),
          trendDirection: entriesTrend >= 0 ? 'up' : 'down'
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/dashboard/recent-activity
 * Returns recent entry/exit activity
 */
dashboardRouter.get('/recent-activity', async (request, response, next) => {
  try {
    const limit = parseInt(request.query.limit) || 10

    // Get recent entries and exits combined
    const recentSessions = await EntrySession.find({})
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Get more to filter
      .select('ID LicensePlate EntryTime ExitTime Status FinalFee CardID VehicleTypeID DiscountReason')
      .lean()

    // Build activity list
    const activities = []

    for (const session of recentSessions) {
      if (activities.length >= limit) break

      // Get vehicle type info
      const vehicleType = await VehicleType.findOne({ VehicleTypeID: session.VehicleTypeID }).select('Name').lean()
      const vehicleTypeName = vehicleType?.Name || 'Unknown'

      // For each session, we might have entry and/or exit
      const card = await Card.findOne({ CardID: session.CardID }).select('CardID CustomerID EmployeeID').lean()

      console.log(`[Dashboard Activity] Session ${session.ID}:`, {
        CardID: session.CardID,
        CardFound: !!card,
        CustomerID: card?.CustomerID,
        EmployeeID: card?.EmployeeID,
        DiscountReason: session.DiscountReason
      })

      let personName = 'Unknown'
      let personType = 'guest'

      // Check if this is a subscription-based session
      const hasSubscription = session.DiscountReason === 'SUBSCRIPTION'

      if (card?.CustomerID) {
        const customer = await Customer.findOne({ ID: card.CustomerID }).select('PersonID').lean()
        console.log(`  Customer found:`, !!customer, customer?.PersonID)
        if (customer?.PersonID) {
          const person = await Person.findOne({ ID: customer.PersonID }).select('FullName').lean()
          console.log(`  Person found:`, !!person, person?.FullName)
          personName = person?.FullName || 'Unknown Customer'
          personType = 'customer'
        }
      } else if (card?.EmployeeID) {
        const employee = await Employee.findOne({ ID: card.EmployeeID }).select('PersonID').lean()
        console.log(`  Employee found:`, !!employee, employee?.PersonID)
        if (employee?.PersonID) {
          const person = await Person.findOne({ ID: employee.PersonID }).select('FullName').lean()
          console.log(`  Person found:`, !!person, person?.FullName)
          personName = person?.FullName || 'Unknown Staff'
          personType = 'staff'
        }
      } else if (!card) {
        personName = 'Guest'
        personType = 'guest'
      }

      // Add exit activity if exists
      if (session.ExitTime) {
        activities.push({
          id: `${session.ID}-exit`,
          type: 'EXIT',
          plate: session.LicensePlate || 'N/A',
          vehicleType: vehicleTypeName,
          personName,
          personType,
          hasSubscription,
          timestamp: session.ExitTime,
          amount: session.FinalFee || 0
        })
      }

      // Add entry activity
      if (activities.length < limit) {
        activities.push({
          id: `${session.ID}-entry`,
          type: 'ENTRY',
          plate: session.LicensePlate || 'N/A',
          vehicleType: vehicleTypeName,
          personName,
          personType,
          hasSubscription,
          timestamp: session.EntryTime,
          amount: null
        })
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    response.json({
      success: true,
      data: activities.slice(0, limit)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/dashboard/capacity
 * Returns parking capacity by vehicle type
 */
dashboardRouter.get('/capacity', async (request, response, next) => {
  try {
    // Get all vehicle types
    const vehicleTypes = await VehicleType.find({}).lean()

    // Define max capacity per type (could be stored in VehicleType model later)
    const capacityConfig = {
      'Ô tô': 500,
      'Xe máy': 1200,
      'Xe tải': 150,
      'Xe khách': 200
    }

    // Count vehicles currently in parking by type
    const sessionsInParking = await EntrySession.find({
      Status: 'IN_PARKING'
    }).select('VehicleTypeID').lean()

    // Group by vehicle type
    const countByType = {}
    for (const session of sessionsInParking) {
      countByType[session.VehicleTypeID] = (countByType[session.VehicleTypeID] || 0) + 1
    }

    // Build capacity response
    const capacityData = vehicleTypes.map(vt => {
      const current = countByType[vt.VehicleTypeID] || 0
      const max = capacityConfig[vt.Name] || 100
      const percent = max > 0 ? Math.round((current / max) * 100) : 0

      return {
        id: vt.VehicleTypeID,
        name: vt.Name,
        current,
        max,
        percent,
        // Map to tone for frontend
        tone: vt.Name === 'Ô tô' ? 'blue'
          : vt.Name === 'Xe máy' ? 'purple'
            : vt.Name === 'Xe tải' ? 'orange'
              : 'green'
      }
    })

    response.json({
      success: true,
      data: capacityData
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/dashboard/alerts
 * Returns active system alerts
 */
dashboardRouter.get('/alerts', async (request, response, next) => {
  try {
    const alerts = []
    const now = new Date()

    // Check capacity alerts
    const vehicleTypes = await VehicleType.find({}).lean()
    const capacityConfig = {
      'Ô tô': 500,
      'Xe máy': 1200,
      'Xe tải': 150,
      'Xe khách': 200
    }

    const sessionsInParking = await EntrySession.find({
      Status: 'IN_PARKING'
    }).select('VehicleTypeID').lean()

    const countByType = {}
    for (const session of sessionsInParking) {
      countByType[session.VehicleTypeID] = (countByType[session.VehicleTypeID] || 0) + 1
    }

    // Generate capacity alerts
    for (const vt of vehicleTypes) {
      const current = countByType[vt.VehicleTypeID] || 0
      const max = capacityConfig[vt.Name] || 100
      const percent = max > 0 ? Math.round((current / max) * 100) : 0

      if (percent >= 90) {
        alerts.push({
          id: `capacity-${vt.VehicleTypeID}`,
          tone: 'danger',
          title: `${vt.Name} parking ${percent}% full (${current}/${max})`,
          timestamp: now
        })
      } else if (percent >= 80) {
        alerts.push({
          id: `capacity-${vt.VehicleTypeID}`,
          tone: 'warning',
          title: `${vt.Name} parking ${percent}% full (${current}/${max})`,
          timestamp: now
        })
      }
    }

    // Check for shift changes in next 30 minutes
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000)
    const shiftsEndingSoon = await Shift.find({
      Status: 'IN_PROGRESS',
      CheckInTime: { $lte: new Date(now.getTime() - 7.5 * 60 * 60 * 1000) } // 7.5 hours ago (assuming 8hr shifts)
    }).countDocuments()

    if (shiftsEndingSoon > 0) {
      alerts.push({
        id: 'shift-change',
        tone: 'info',
        title: 'Shift change due in 30 minutes',
        timestamp: now
      })
    }

    // Sort by severity: danger > warning > info
    const severityOrder = { danger: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.tone] - severityOrder[b.tone])

    response.json({
      success: true,
      data: alerts.slice(0, 5) // Return top 5 alerts
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/dashboard/revenue-trend
 * Returns hourly revenue data for today (last 6 hours)
 */
dashboardRouter.get('/revenue-trend', async (request, response, next) => {
  try {
    const now = new Date()
    const hoursAgo = parseInt(request.query.hours) || 6
    const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

    // Get all exited sessions in the time range
    const exitedSessions = await EntrySession.find({
      Status: 'EXITED',
      ExitTime: { $gte: startTime, $lte: now }
    }).select('ExitTime FinalFee').lean()

    // Get all invoices in the time range
    const invoices = await CardPurchaseInvoice.find({
      InvoiceDate: { $gte: startTime, $lte: now },
      Status: 'COMPLETED'
    }).select('InvoiceDate TotalAmount').lean()

    // Group by hour
    const revenueByHour = {}

    // Initialize all hours with 0
    for (let i = 0; i <= hoursAgo; i++) {
      const hourTime = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      const hourKey = hourTime.getHours()
      revenueByHour[hourKey] = 0
    }

    // Add session revenue
    exitedSessions.forEach(session => {
      const hour = new Date(session.ExitTime).getHours()
      revenueByHour[hour] = (revenueByHour[hour] || 0) + (session.FinalFee || 0)
    })

    // Add invoice revenue
    invoices.forEach(invoice => {
      const hour = new Date(invoice.InvoiceDate).getHours()
      revenueByHour[hour] = (revenueByHour[hour] || 0) + (invoice.TotalAmount || 0)
    })

    // Convert to array format for charts
    const trendData = Object.keys(revenueByHour)
      .sort((a, b) => a - b)
      .map(hour => ({
        hour: parseInt(hour),
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        revenue: revenueByHour[hour]
      }))

    response.json({
      success: true,
      data: trendData
    })
  } catch (error) {
    next(error)
  }
})

module.exports = dashboardRouter
