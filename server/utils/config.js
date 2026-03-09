const path = require('path')
const dotenv = require('dotenv')

// Load env vars from server/.env if present (works even when starting from repo root).
// Render will inject env vars directly (no .env file needed there).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const PORT = process.env.PORT || 3001
const MONGODB_URI =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_MONGODB_URI
    : process.env.MONGODB_URI

if (!MONGODB_URI) {
  // Fail fast with a clear message instead of trying to connect with undefined.
  // This is especially helpful in Render deploys and local dev.
  // eslint-disable-next-line no-console
  console.error(
    'Missing MONGODB_URI. Set it in environment variables (recommended) or create server/.env with MONGODB_URI=...'
  )
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'

const LP_SERVICE_URL = process.env.LP_SERVICE_URL || 'http://localhost:5001'

module.exports = {
  MONGODB_URI,
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  LP_SERVICE_URL
}
