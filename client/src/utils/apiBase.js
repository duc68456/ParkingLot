// Centralized API base URL for the client.
//
// Render-friendly behavior:
// - In production, default to same-origin (""), so a static site can call an API via
//   a rewrite/proxy or when served by the same Node service.
// - In development, default to the local backend.
// - You can always override with VITE_API_BASE_URL.

const DEV_FALLBACK = 'http://localhost:3001'

export function getApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (fromEnv) return fromEnv

  // Vite sets MODE and DEV.
  if (import.meta.env.DEV) return DEV_FALLBACK

  // Production: same-origin
  return ''
}
