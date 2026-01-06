const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')

app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${config.PORT}`)
})
