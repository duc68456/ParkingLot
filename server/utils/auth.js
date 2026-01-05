const jwt = require('jsonwebtoken')
const config = require('./config')

function requireJwtSecret() {
  if (!config.JWT_SECRET) {
    const err = new Error('JWT_SECRET is not configured')
    err.code = 'JWT_SECRET_MISSING'
    throw err
  }
}

function signToken(payload) {
  requireJwtSecret()
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  })
}

function verifyToken(token) {
  requireJwtSecret()
  return jwt.verify(token, config.JWT_SECRET)
}

module.exports = {
  signToken,
  verifyToken
}
