import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db/connection'

const JWT_SECRET = process.env.JWT_SECRET || 'b2b-law-cloud-jwt-secret-change-in-production'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'

export interface AuthPayload {
  userId: string
  companyId: string
  username: string
  roleKey: string
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' } as any)
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
    
    // Check trial expiration
    const companyResult = await query('SELECT trial_expires_at FROM companies WHERE id = $1', [payload.companyId])
    if (companyResult.rows.length > 0) {
      const trialExpiresAt = new Date(companyResult.rows[0].trial_expires_at)
      if (trialExpiresAt < new Date()) {
        res.status(403).json({ error: 'TrialExpired', message: 'انتهت الفترة التجريبية.' })
        return
      }
    }

    req.auth = payload
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
