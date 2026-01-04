const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')

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
app.use(express.json())
app.use(middleware.requestLogger)

// Phase 1: Core Entities Routes
app.use('/api/persons', personsRouter)
app.use('/api/vehicle-types', vehicleTypesRouter)
app.use('/api/card-categories', cardCategoriesRouter)

// Phase 2: User Management Routes
app.use('/api/customers', customersRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/staff-accounts', staffAccountsRouter)
app.use('/api/admin-accounts', adminAccountsRouter)

// Phase 3: Vehicle & Card Management Routes
app.use('/api/vehicles', vehiclesRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/card-prices', cardPricesRouter)

// Phase 4: Pricing Rules Routes
app.use('/api/subscription-types', subscriptionTypesRouter)
app.use('/api/single-pricing-rules', singlePricingRulesRouter)
app.use('/api/subscription-pricing-rules', subscriptionPricingRulesRouter)
app.use('/api/subscription-pricing-rule-details', subscriptionPricingRuleDetailsRouter)

// Phase 5: Sales & Invoicing Routes
app.use('/api/card-purchase-invoices', cardPurchaseInvoicesRouter)

// Phase 6: Returns System Routes
app.use('/api/card-returns', cardReturnsRouter)
app.use('/api/return-batches', returnBatchesRouter)

// Phase 7: Subscription Management Routes
app.use('/api/subscriptions', subscriptionsRouter)

// Phase 8: Entry/Exit Operations Routes
app.use('/api/entry-sessions', entrySessionsRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app
