const logger = require('./logger')
const auth = require('./auth')
const { resolveAuthzForEmployee } = require('./authorization')

const normalize = (v) => String(v || '').trim()
const upper = (v) => normalize(v).toUpperCase()

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (
    error.name === 'MongoServerError' &&
    error.message.includes('E11000 duplicate key error')
  ) {
    return response
      .status(400)
      .json({ error: 'expected `username` to be unique' })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  next(error)
}

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7)
  } else {
    request.token = null
  }
  next()
}

const authRequired = (request, response, next) => {
  try {
    if (!request.token) {
      return response.status(401).json({
        success: false,
        error: { message: 'token missing or invalid', code: 'TOKEN_MISSING' }
      })
    }

    const decoded = auth.verifyToken(request.token)
    request.user = decoded
    next()
  } catch (err) {
    return response.status(401).json({
      success: false,
      error: { message: 'token missing or invalid', code: 'TOKEN_INVALID' }
    })
  }
}

const adminOnly = (request, response, next) => {
  if (request.user?.type !== 'admin') {
    return response.status(403).json({
      success: false,
      error: { message: 'forbidden', code: 'FORBIDDEN' }
    })
  }
  next()
}

// Authorization: require specific permission codes.
// Permissions are expected to be stored in the JWT payload (request.user.permissions).
// Usage: middleware.requirePermissions(['PEOPLE.ACCESS_MANAGEMENT_HUB'])
const requirePermissions = (permissionCodes = []) => {
  const required = (Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes])
    .map((p) => String(p || '').trim().toUpperCase())
    .filter(Boolean)

  return async (request, response, next) => {
    if (!required.length) return next()

    // Dynamic authz: permissions are plain-text codes aggregated from all roles.
    // Prefer JWT permissions when present, otherwise resolve from DB per request.
    let permsRaw = request.user?.permissions || request.user?.Permissions || []
    let permissions = (Array.isArray(permsRaw) ? permsRaw : [])
      .map((p) => String(p || '').trim().toUpperCase())
      .filter(Boolean)

    if (!permissions.length) {
      const employeeBusinessId = request.user?.employeeBusinessId || request.user?.employeeId
      if (employeeBusinessId) {
        try {
          const resolved = await resolveAuthzForEmployee(employeeBusinessId)
          permissions = (resolved?.permissions || [])
            .map((p) => String(p || '').trim().toUpperCase())
            .filter(Boolean)
        } catch (err) {
          // If dynamic resolution fails, we'll treat as no permissions.
          permissions = []
        }
      }
    }

    const have = new Set(permissions)

    const ok = required.every((p) => have.has(p))
    if (!ok) {
      return response.status(403).json({
        success: false,
        error: {
          message: 'forbidden',
          code: 'FORBIDDEN_PERMISSION',
          details: `Missing required permission(s): ${required.filter((p) => !have.has(p)).join(', ')}`
        }
      })
    }

    next()
  }
}

module.exports = {
  requestLogger,
  tokenExtractor,
  authRequired,
  adminOnly,
  requirePermissions,
  unknownEndpoint,
  errorHandler
}
