import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db/connection'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'

const DEFAULT_SECRETS = [
  'b2b-law-cloud-jwt-secret-change-in-production',
  'your-secret-key-here-change-in-production',
  'my-secret-key'
]

const isDevSecret = JWT_SECRET === 'b2b-law-cloud-dev-secret'
const isProduction = process.env.NODE_ENV === 'production'

if (!JWT_SECRET || DEFAULT_SECRETS.includes(JWT_SECRET)) {
  if (isProduction) {
    console.error('❌ CRITICAL: JWT_SECRET is not set, is still a default value, or is a development secret!');
    process.exit(1);
  }
}

export interface AuthPayload {
  userId: string
  companyId: string
  username: string
  roleKey: string
  trialExpired?: boolean
  subscriptionStatus?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any)
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' })
    return
  }
  try {
    const payload = verifyToken(header.substring(7))
    
    // Check subscription status from subscriptions table
    const subResult = await query(
      `SELECT status, current_period_end, trial_end FROM subscriptions
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [payload.companyId]
    )

    let isExpired = false
    let subscriptionStatus = 'trial'
    let fallbackEnd: Date | null = null

    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0]
      subscriptionStatus = sub.status
      const endDate = sub.current_period_end || sub.trial_end
      if (endDate) fallbackEnd = new Date(endDate)
      if (fallbackEnd && fallbackEnd < new Date() && sub.status !== 'lifetime') {
        isExpired = true
      }
    } else {
      // Fallback to companies.trial_expires_at for backward compatibility
      const companyResult = await query(
        'SELECT trial_expires_at FROM companies WHERE id = $1',
        [payload.companyId]
      )
      if (companyResult.rows.length > 0 && companyResult.rows[0].trial_expires_at) {
        fallbackEnd = new Date(companyResult.rows[0].trial_expires_at)
        if (fallbackEnd < new Date()) {
          isExpired = true
        }
      }
    }

    const isExcludedPath = 
      req.path.startsWith('/system/') || 
      req.originalUrl.includes('/system/') ||
      req.path.startsWith('/subscriptions/') ||
      req.originalUrl.includes('/subscriptions/') ||
      req.path.startsWith('/admin/') ||
      req.originalUrl.includes('/admin/')

    if (isExpired && req.method !== 'GET' && !isExcludedPath) {
      res.status(403).json({
        error: 'TrialExpiredWriteForbidden',
        message: 'انتهت الفترة التجريبية. يرجى الاشتراك للاستمرار في الإضافة والتعديل.',
        subscriptionUrl: '/subscription'
      })
      return
    }

    req.auth = {
      ...payload,
      trialExpired: isExpired,
      subscriptionStatus
    }
    next()
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      req.auth = verifyToken(header.substring(7))
    } catch {}
  }
  next()
}
