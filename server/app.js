const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')
const cors = require('cors')

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
const cardReturnsRouter = require('./controllers/cardReturns')
const returnBatchesRouter = require('./controllers/returnBatches')

// Phase 7: Subscription Management
const subscriptionsRouter = require('./controllers/subscriptions')

// Phase 8: Entry/Exit Operations
const entrySessionsRouter = require('./controllers/entrySessions')

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

app.use(express.static('dist'))
app.use(
  cors({
    origin: [
      // Vite dev server (common ports)
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
app.use(express.json())
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

// Phase 1: Core Entities Routes
app.use('/api/persons', middleware.authRequired, middleware.adminOnly, personsRouter)
app.use('/api/vehicle-types', middleware.authRequired, vehicleTypesRouter)
app.use('/api/card-categories', middleware.authRequired, middleware.adminOnly, cardCategoriesRouter)

// Phase 2: User Management Routes
app.use('/api/customers', middleware.authRequired, middleware.adminOnly, customersRouter)
app.use('/api/employees', middleware.authRequired, middleware.adminOnly, employeesRouter)
// Account creation and listing should be admin-only; login endpoints remain public in their routers.
app.use('/api/staff-accounts', staffAccountsRouter)
app.use('/api/admin-accounts', adminAccountsRouter)

// Phase 3: Vehicle & Card Management Routes
app.use('/api/vehicles', middleware.authRequired, middleware.adminOnly, vehiclesRouter)
app.use('/api/cards', middleware.authRequired, middleware.adminOnly, cardsRouter)
app.use('/api/card-prices', middleware.authRequired, middleware.adminOnly, cardPricesRouter)

// Phase 4: Pricing Rules Routes
app.use('/api/subscription-types', middleware.authRequired, middleware.adminOnly, subscriptionTypesRouter)
app.use('/api/single-pricing-rules', middleware.authRequired, middleware.adminOnly, singlePricingRulesRouter)
app.use('/api/subscription-pricing-rules', middleware.authRequired, middleware.adminOnly, subscriptionPricingRulesRouter)
app.use('/api/subscription-pricing-rule-details', middleware.authRequired, middleware.adminOnly, subscriptionPricingRuleDetailsRouter)

// Phase 5: Sales & Invoicing Routes
app.use('/api/card-purchase-invoices', middleware.authRequired, middleware.adminOnly, cardPurchaseInvoicesRouter)

// Phase 6: Returns System Routes
app.use('/api/card-returns', middleware.authRequired, middleware.adminOnly, cardReturnsRouter)
app.use('/api/return-batches', middleware.authRequired, middleware.adminOnly, returnBatchesRouter)

// Phase 7: Subscription Management Routes
app.use('/api/subscriptions', middleware.authRequired, middleware.adminOnly, subscriptionsRouter)

// Phase 8: Entry/Exit Operations Routes
// Note: some endpoints should be available to authenticated staff (gate operations).
// Route-level access control is handled inside the controller.
app.use('/api/entry-sessions', middleware.authRequired, entrySessionsRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app
