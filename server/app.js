const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')
const cors = require('cors')
const { resolveAuthzForEmployee } = require('./utils/authorization')
const path = require('path')

// Phase 1: Core Entities
const personsRouter = require('./controllers/persons')
const vehicleTypesRouter = require('./controllers/vehicleTypes')
const cardCategoriesRouter = require('./controllers/cardCategories')

// Phase 2: User Management
const customersRouter = require('./controllers/customers')
const employeesRouter = require('./controllers/employees')
const staffAccountsRouter = require('./controllers/staffAccounts')
const adminAccountsRouter = require('./controllers/adminAccounts')

// Phase 3: Vehicle & Card Management
const vehiclesRouter = require('./controllers/vehicles')
const cardsRouter = require('./controllers/cards')
const cardPricesRouter = require('./controllers/cardPrices')

// Phase 4: Pricing Rules
const subscriptionTypesRouter = require('./controllers/subscriptionTypes')
const singlePricingRulesRouter = require('./controllers/singlePricingRules')
const subscriptionPricingRulesRouter = require('./controllers/subscriptionPricingRules')
const subscriptionPricingRuleDetailsRouter = require('./controllers/subscriptionPricingRuleDetails')

// Phase 5: Sales & Invoicing
const cardPurchaseInvoicesRouter = require('./controllers/cardPurchaseInvoices')

// Phase 6: Returns System
const cardReturnLogsRouter = require('./controllers/cardReturnLogs')

// Phase 7: Subscription Management
const subscriptionsRouter = require('./controllers/subscriptions')

// Phase 8: Entry/Exit Operations
const entrySessionsRouter = require('./controllers/entrySessions')

// Phase 9: Shift Management
const shiftsRouter = require('./controllers/shifts')

// Phase 9.1: Shift Report & Details
const shiftReportsRouter = require('./controllers/shiftReports')
const shiftReportDetailsRouter = require('./controllers/shiftReportDetails')

// Dashboard
const dashboardRouter = require('./controllers/dashboard')

// Reports
const reportsRouter = require('./controllers/reports')

// Authz
const rolesRouter = require('./controllers/roles')
const permissionsRouter = require('./controllers/permissions')

// System Config
const systemConfigRouter = require('./controllers/systemConfig')

const app = express()

logger.info('connecting to', config.MONGODB_URI)

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    logger.info('connected to MongoDB')
  })
  .catch(error => {
    logger.error('error connection to MongoDB:', error.message)
  })

// --- CORS (Render-friendly) ---
// In production, Render often serves frontend and backend on different domains.
// Configure allowed origins with CORS_ORIGIN (comma-separated) or '*' for public APIs.
const parseOrigins = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN)
const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser requests (no Origin) like health checks.
    if (!origin) return cb(null, true)
    if (!allowedOrigins.length) {
      // Default dev origins
      const ok = origin === 'http://localhost:5173' || origin === 'http://localhost:5174'
      return cb(null, ok)
    }
    if (allowedOrigins.includes('*')) return cb(null, true)
    return cb(null, allowedOrigins.includes(origin))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}

app.use(cors(corsOptions))

// --- Health check ---
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// API root (only when not serving the client)
// This makes visiting http://localhost:3001 in a browser show something useful.
if (process.env.SERVE_CLIENT !== 'true') {
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'ParkingLot API',
      status: 'ok',
      docs: '/api',
      health: '/health'
    })
  })
}

// --- Static frontend (optional) ---
// If you deploy a single Render web service (Node) that also serves the built Vite app,
// put the client build output into server/dist and set SERVE_CLIENT=true.
if (process.env.SERVE_CLIENT === 'true') {
  const distPath = path.join(__dirname, 'dist')
  app.use(express.static(distPath))
}
// Increase payload size limit for base64 images (50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

// Dynamic AuthZ introspection
// Returns roleIds + permissions for the currently authenticated user.
app.get('/api/authz/me', middleware.authRequired, async (request, response) => {
  try {
    const employeeBusinessId = request.user?.employeeBusinessId || request.user?.employeeId
    if (!employeeBusinessId) {
      return response.status(200).json({
        success: true,
        data: { employeeBusinessId: null, roleIds: [], permissions: [] }
      })
    }

    const resolved = await resolveAuthzForEmployee(employeeBusinessId)
    return response.status(200).json({
      success: true,
      data: {
        employeeBusinessId: String(employeeBusinessId),
        roleIds: resolved?.roleIds || [],
        permissions: resolved?.permissions || []
      }
    })
  } catch (err) {
    return response.status(500).json({
      success: false,
      error: { message: 'Failed to resolve authz', details: err?.message }
    })
  }
})

// Phase 1: Core Entities Routes
app.use('/api/persons', middleware.authRequired, middleware.adminOnly, personsRouter)
app.use('/api/vehicle-types', middleware.authRequired, vehicleTypesRouter)
app.use('/api/card-categories', middleware.authRequired, middleware.adminOnly, cardCategoriesRouter)

// Phase 2: User Management Routes
app.use('/api/customers', middleware.authRequired, customersRouter)
app.use('/api/employees', middleware.authRequired, employeesRouter)
// Account creation and listing should be admin-only; login endpoints remain public in their routers.
app.use('/api/staff-accounts', staffAccountsRouter)
app.use('/api/admin-accounts', adminAccountsRouter)

// Authz routes (permission-based access control)
app.use('/api/roles', middleware.authRequired, rolesRouter)
app.use('/api/permissions', middleware.authRequired, permissionsRouter)

// System config routes
app.use('/api/system-config', systemConfigRouter)

// Phase 3: Vehicle & Card Management Routes
app.use('/api/vehicles', middleware.authRequired, vehiclesRouter)
app.use('/api/cards', middleware.authRequired, cardsRouter)
app.use('/api/card-prices', middleware.authRequired, cardPricesRouter)

// Phase 4: Pricing Rules Routes
app.use('/api/subscription-types', middleware.authRequired, subscriptionTypesRouter)
app.use('/api/single-pricing-rules', middleware.authRequired, singlePricingRulesRouter)
app.use('/api/subscription-pricing-rules', middleware.authRequired, subscriptionPricingRulesRouter)
app.use('/api/subscription-pricing-rule-details', middleware.authRequired, subscriptionPricingRuleDetailsRouter)

// Phase 5: Sales & Invoicing Routes
app.use('/api/card-purchase-invoices', middleware.authRequired, cardPurchaseInvoicesRouter)

// Phase 6: Returns System Routes
app.use('/api/card-return-logs', middleware.authRequired, cardReturnLogsRouter)

// Phase 7: Subscription Management Routes
app.use('/api/subscriptions', middleware.authRequired, subscriptionsRouter)

// Phase 8: Entry/Exit Operations Routes
// Note: some endpoints should be available to authenticated staff (gate operations).
// Route-level access control is handled inside the controller.
app.use('/api/entry-sessions', middleware.authRequired, entrySessionsRouter)

// Staff Gate Operations (for staff gate page - no adminOnly)
const staffGateRouter = require('./controllers/staffGate')
app.use('/api/staff-gate', middleware.authRequired, staffGateRouter)

// Phase 9: Shift Management Routes
app.use('/api/shifts', middleware.authRequired, shiftsRouter)

// Shift report routes (admin or staff)
app.use('/api/shift-reports', middleware.authRequired, shiftReportsRouter)
app.use('/api/shift-report-details', middleware.authRequired, shiftReportDetailsRouter)

// Reports Routes (admin only)
app.use('/api/reports', middleware.authRequired, reportsRouter)

// Dashboard Routes
app.use('/api/dashboard', middleware.authRequired, dashboardRouter)

// SPA fallback for React Router (only when serving the client build)
if (process.env.SERVE_CLIENT === 'true') {
  const distIndex = path.join(__dirname, 'dist', 'index.html')
  // Express 5 uses path-to-regexp v6, which does not accept the bare "*" string.
  // Use a regex catch-all instead.
  app.get(/^(?!\/api).*$/, (req, res) => {
    return res.sendFile(distIndex)
  })
}

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app
