import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

// In-memory token store — production should use Redis with TTL
const tokenStore = new Map<string, { expiresAt: number; userId?: string }>()

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // every 10 min

// Periodic cleanup of expired tokens
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [token, entry] of tokenStore) {
    if (entry.expiresAt < now) {
      tokenStore.delete(token)
    }
  }
}, CLEANUP_INTERVAL_MS)
cleanupTimer.unref()

/**
 * Generate a new CSRF token, store it with a TTL, and set it on a cookie.
 * Returns the token string to also include in the response body for SPA usage.
 */
export function generateCsrfToken(req: Request, res: Response): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + TOKEN_TTL_MS

  // Associate with session/user if available
  const userId = (req as any).userId as string | undefined
  tokenStore.set(token, { expiresAt, userId })

  // Set a double-submit cookie — the client reads it and sends it as a header
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,       // JS must be able to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  })

  return token
}

/**
 * Validate the X-XSRF-TOKEN header against the stored token.
 * Skips validation for safe methods (GET, HEAD, OPTIONS).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase()

  // Safe methods don't need CSRF protection
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }

  const token = req.headers['x-xsrf-token'] as string | undefined
  if (!token) {
    res.status(403).json({ error: 'Missing CSRF token' })
    return
  }

  const stored = tokenStore.get(token)
  if (!stored || stored.expiresAt < Date.now()) {
    tokenStore.delete(token)
    res.status(403).json({ error: 'Invalid or expired CSRF token' })
    return
  }

  next()
}

/**
 * Remove a CSRF token (e.g. on logout).
 */
export function revokeCsrfToken(token: string): void {
  tokenStore.delete(token)
}
