const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')

if (!config.MONGODB_URI) {
  logger.error('Server not started: missing MONGODB_URI')
  process.exit(1)
}

app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${config.PORT}`)
})
