import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { OAuth2Client } from 'google-auth-library'
import { query, getClient } from '../db/connection'
import { generateToken, authMiddleware, revokeToken } from '../middleware/auth'
import { getUserPermissions } from '../middleware/permission'
import { generateSecret, getQrCodeUrl, verifyToken } from '../utils/totp'
import { generateCsrfToken, revokeCsrfToken } from '../middleware/csrf'
import {
  sendOTP,
  sendEmail,
  getTransporter,
  notifyAdminOfNewRegistration
} from '../services/notification'

export const authRouter = Router()

async function logActivity(
  actor: string,
  actionKey: string,
  moduleKey: string,
  details: string,
  metadata?: any,
  companyId?: string
): Promise<void> {
  try {
    const cid =
      companyId || process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000'
    await query(
      `INSERT INTO activity_logs (id, company_id, action_key, module_key, details, actor, metadata_json, timestamp)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, NOW())`,
      [cid, actionKey, moduleKey, details, actor, metadata ? JSON.stringify(metadata) : null]
    )
  } catch (e) {
    // Old activity_logs table may not exist — silently ignore
  }

  // Also write to new user_activity_logs for the subscriber detail page
  try {
    if (metadata?.userId && metadata?.companyId) {
      await query(
        `INSERT INTO user_activity_logs (id, user_id, company_id, activity_type, activity_description, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), metadata.userId, metadata.companyId, actionKey, details]
      )
    }
  } catch (e: any) {
    console.error('[TRACKING] activity_logs write failed:', e?.message || e)
  }
}

async function logLoginAttempt(
  userId: string,
  companyId: string,
  isSuccessful: boolean,
  failureReason?: string,
  req?: Request
): Promise<void> {
  try {
    const ip = req?.ip || req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown'
    const userAgent = req?.headers['user-agent'] || ''
    const deviceInfo = parseDevice(userAgent)
    const browserInfo = parseBrowser(userAgent)
    await query(
      `INSERT INTO user_login_logs (id, user_id, company_id, ip_address, user_agent, device_info, browser_info, is_successful, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(),
        userId,
        companyId,
        ip,
        userAgent,
        deviceInfo,
        browserInfo,
        isSuccessful,
        failureReason || null
      ]
    )
  } catch (e: any) {
    console.error('[TRACKING] login_log write failed:', e?.message || e)
  }
}

function parseDevice(ua: string): string {
  if (!ua) return 'unknown'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return /ipad/i.test(ua) ? 'iPad' : 'iPhone'
  if (/windows/i.test(ua)) return 'Windows'
  if (/macintosh|mac os/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Other'
}

function parseBrowser(ua: string): string {
  if (!ua) return 'unknown'
  if (/edg|edge/i.test(ua)) return 'Edge'
  if (/chrome/i.test(ua) && !/opr|opera/i.test(ua)) return 'Chrome'
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari'
  if (/opr|opera/i.test(ua)) return 'Opera'
  return 'Other'
}

const authAttempts = new Map<string, { count: number; resetTime: number }>()
const otpAttempts = new Map<string, { count: number; resetTime: number }>()
const oauthCodes = new Map<string, { token: string; createdAt: number }>()

// --- Cookie-bound HMAC OAuth state helpers ---
// Instead of an in-memory Map (lost on restart, not shared across instances),
// we bind the OAuth state to the originating browser via an HttpOnly cookie
// and verify integrity with HMAC-SHA256 signed by JWT_SECRET.
const crypto = require('crypto')
const OAUTH_STATE_SECRET = process.env.JWT_SECRET || 'oauth-dev-fallback-secret'

function createOAuthState(res: Response): string {
  const nonce = crypto.randomBytes(32).toString('hex')
  const timestamp = Date.now().toString(36)
  const payload = `${nonce}.${timestamp}`
  const hmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex')
  const state = `${payload}.${hmac}`

  // Set nonce in an HttpOnly cookie bound to this browser
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie('__oauth_nonce', nonce, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',        // Must be 'lax' — callback is a top-level GET redirect from Google
    path: '/api/auth',
    maxAge: 10 * 60 * 1000  // 10 minutes (600,000 ms)
  })

  return state
}

function verifyOAuthState(req: Request, res: Response): boolean {
  const { state } = req.query
  if (!state || typeof state !== 'string') {
    console.warn('[OAUTH_STATE] Verification failed: missing or non-string state parameter')
    return false
  }

  // Split state into nonce.timestamp.hmac
  const parts = state.split('.')
  if (parts.length !== 3) {
    console.warn('[OAUTH_STATE] Verification failed: state format invalid')
    return false
  }
  const [stateNonce, timestamp, receivedHmac] = parts

  // 1. Verify freshness: state must not be older than 10 minutes
  const createdAt = parseInt(timestamp, 36)
  if (isNaN(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) {
    console.warn('[OAUTH_STATE] Verification failed: state timestamp expired')
    return false
  }

  // 2. Verify HMAC integrity: state was generated by this server with OAUTH_STATE_SECRET
  const payload = `${stateNonce}.${timestamp}`
  const expectedHmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex')
  try {
    const receivedBuf = Buffer.from(receivedHmac, 'hex')
    const expectedBuf = Buffer.from(expectedHmac, 'hex')
    if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
      console.warn('[OAUTH_STATE] Verification failed: HMAC mismatch (hmacValid=false)')
      return false
    }
  } catch {
    console.warn('[OAUTH_STATE] Verification failed: HMAC buffer error')
    return false
  }

  // 3. Anti-CSRF cookie check (if cookie was preserved by browser across cross-site redirect)
  const cookieHeader = req.headers.cookie || ''
  const nonceMatch = cookieHeader.match(/(?:^|;\s*)__oauth_nonce=([^;]+)/)
  const cookieNonce = nonceMatch ? decodeURIComponent(nonceMatch[1]) : null

  if (cookieNonce && cookieNonce !== stateNonce) {
    console.warn('[OAUTH_STATE] Verification failed: state nonce does not match cookie nonce')
    return false
  }

  if (cookieNonce) {
    res.clearCookie('__oauth_nonce', { path: '/api/auth' })
  }

  console.log('[OAUTH_STATE] Verification succeeded: state signature and freshness valid (verified=true)')
  return true
}
// --- End OAuth state helpers ---

// Periodic cleanup to prevent memory leak — purges expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [key, val] of authAttempts.entries()) {
      if (now > val.resetTime) authAttempts.delete(key)
    }
    for (const [key, val] of otpAttempts.entries()) {
      if (now > val.resetTime) otpAttempts.delete(key)
    }
    // Clean up expired OAuth codes (60s TTL)
    for (const [key, val] of oauthCodes.entries()) {
      if (now - val.createdAt > 60_000) oauthCodes.delete(key)
    }
  },
  5 * 60 * 1000
).unref()

const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 50 // max 50 attempts

  const attempt = authAttempts.get(ip)
  if (!attempt) {
    authAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  if (now > attempt.resetTime) {
    authAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  attempt.count++
  if (attempt.count > maxAttempts) {
    const minutesLeft = Math.ceil((attempt.resetTime - now) / 60000)
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `لقد تجاوزت الحد الأقصى لمحاولات تسجيل الدخول أو التفعيل. يرجى المحاولة بعد ${minutesLeft} دقيقة.`
    })
  }

  next()
}

// Stricter rate limiter for OTP verification — 5 attempts per 15 minutes
const otpRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const attempt = otpAttempts.get(ip)
  if (!attempt) {
    otpAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  if (now > attempt.resetTime) {
    otpAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  attempt.count++
  if (attempt.count > maxAttempts) {
    const minutesLeft = Math.ceil((attempt.resetTime - now) / 60000)
    return res.status(429).json({
      error: 'TooManyOtpAttempts',
      message: `تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى المحاولة بعد ${minutesLeft} دقيقة.`
    })
  }

  next()
}

authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, companyId } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' })
      return
    }

    const searchUsername = username.trim().toLowerCase()

    const params: any[] = [searchUsername]
    let userQuery = `SELECT u.*, u.company_id, u.role_key, u.is_suspended FROM users u WHERE (LOWER(u.username) = $1 OR LOWER(u.recovery_email) = $1)`

    if (companyId) {
      params.push(companyId)
      userQuery += ` AND u.company_id = $${params.length}`
    }

    // Order by most recently created first — ensures admin login picks the latest seed
    userQuery += ` ORDER BY u.created_at DESC`

    const result = await query(userQuery, params)
    if (result.rows.length === 0) {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - مستخدم غير موجود')
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
      return
    }

    const user = result.rows[0]
    if (!user.is_active) {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - حساب معطل')
      await logLoginAttempt(user.id, user.company_id, false, 'حساب معطل', req)
      res.status(403).json({
        error: 'AccountSuspended',
        message: 'تم تعطيل حسابك. يرجى التواصل مع الدعم الفني للمساعدة.'
      })
      return
    }

    if (user.is_suspended) {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - حساب معلق')
      await logLoginAttempt(user.id, user.company_id, false, 'حساب معلق', req)
      res.status(403).json({
        error: 'AccountSuspended',
        message: 'تم تعليق حسابك. يرجى التواصل مع الدعم الفني للمساعدة.'
      })
      return
    }

    if (!user.password_hash) {
      await logActivity(
        username,
        'LOGIN_FAILED',
        'auth',
        'محاولة دخول فاشلة - كلمة المرور غير معرفة'
      )
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - كلمة مرور خاطئة')
      await logLoginAttempt(user.id, user.company_id, false, 'كلمة مرور خاطئة', req)
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
      return
    }

    // Check trial verification & expiration
    let trialExpired = false
    let trialExpiresAt = null
    const companyResult = await query(
      'SELECT is_verified, trial_expires_at, is_deleted FROM companies WHERE id = $1',
      [user.company_id]
    )
    if (companyResult.rows.length > 0) {
      const company = companyResult.rows[0]

      // Check if company is soft-deleted
      if (company.is_deleted) {
        await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - الحساب محذوف')
        await logLoginAttempt(user.id, user.company_id, false, 'حساب محذوف', req)
        res.status(403).json({
          error: 'AccountSuspended',
          message: 'تم تعطيل حسابك. يرجى التواصل مع الدعم الفني للمساعدة.'
        })
        return
      }

      if (!company.is_verified && user.role_key !== 'admin' && user.company_id !== (process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000')) {
        await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - الحساب غير مفعل')
        await logLoginAttempt(user.id, user.company_id, false, 'حساب غير مفعل', req)
        res.status(403).json({ error: 'AccountNotVerified' })
        return
      }
      trialExpiresAt = company.trial_expires_at
      trialExpired = new Date(trialExpiresAt) < new Date()
    }

    // Check subscription status
    let subscriptionStatus = 'trial'
    if (
      user.company_id ===
      (process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000')
    ) {
      subscriptionStatus = 'lifetime'
    } else {
      const subCheck = await query(
        `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.company_id]
      )
      if (subCheck.rows.length > 0) {
        subscriptionStatus = subCheck.rows[0].status
      }
    }

    // Block login if subscription is suspended (past_due)
    if (subscriptionStatus === 'past_due') {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - الاشتراك معلق')
      await logLoginAttempt(user.id, user.company_id, false, 'اشتراك معلق', req)
      res.status(403).json({
        error: 'AccountSuspended',
        message: 'تم تعليق اشتراكك. يرجى التواصل مع الدعم الفني للمساعدة.'
      })
      return
    }

    // Block login if subscription is canceled
    if (subscriptionStatus === 'canceled') {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - الاشتراك ملغي')
      await logLoginAttempt(user.id, user.company_id, false, 'اشتراك ملغي', req)
      res.status(403).json({
        error: 'AccountSuspended',
        message: 'تم إلغاء اشتراكك. يرجى التواصل مع الدعم الفني للمساعدة.'
      })
      return
    }

    // Block login if subscription is expired
    if (subscriptionStatus === 'expired') {
      await logActivity(username, 'LOGIN_FAILED', 'auth', 'محاولة دخول فاشلة - الاشتراك منتهي')
      await logLoginAttempt(user.id, user.company_id, false, 'اشتراك منتهي', req)
      res.status(403).json({
        error: 'AccountSuspended',
        message: 'انتهت صلاحية اشتراكك. يرجى التجديد للمتابعة.'
      })
      return
    }

    // Allow login even if trial expired - will be in read-only mode
    // trialExpired flag is sent to frontend for read-only enforcement

    if (user.two_factor_enabled) {
      res.json({
        requiresMfa: true,
        userId: user.id
      })
      return
    }

    const token = generateToken({
      userId: user.id,
      companyId: user.company_id,
      username: user.username,
      roleKey: user.role_key,
      trialExpired,
      subscriptionStatus
    })

    await logActivity(username, 'LOGIN_SUCCESS', 'auth', 'تسجيل دخول ناجح', {
      userId: user.id,
      companyId: user.company_id,
      roleKey: user.role_key
    })
    await logLoginAttempt(user.id, user.company_id, true, undefined, req)

    // Notify the admin of successful login
    query('SELECT email FROM companies WHERE id = $1', [user.company_id])
      .then((emailResult) => {
        const companyEmail = emailResult.rows[0]?.email || 'غير متوفر'
        return sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@b2blaw.local',
          subject: `🔑 تسجيل دخول جديد: ${user.full_name || username}`,
          text: `مرحباً،\n\nقام مستخدم بتسجيل الدخول إلى حسابه يدوياً:\n\n- الاسم الكامل: ${user.full_name || username}\n- اسم المستخدم: ${username}\n- البريد الإلكتروني للمكتب: ${companyEmail}\n- وقت الدخول: ${new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })}\n\nشكراً لك.`
        })
      })
      .catch((e) => {
        console.error('Failed to notify admin of manual login:', e)
      })

    const permissions = await getUserPermissions(user.company_id, user.id, user.role_key)
    const csrfToken = generateCsrfToken(req, res)

    res.json({
      token,
      csrfToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        roleKey: user.role_key,
        companyId: user.company_id,
        employeeId: user.employee_id,
        mustChangePassword: user.must_change_password,
        trialExpired,
        trialExpiresAt,
        subscriptionStatus,
        permissions
      }
    })
  } catch (err) {
    console.error('[AUTH] Login error:', err)
    res.status(500).json({ error: 'فشل تسجيل الدخول' })
  }
})

authRouter.post('/recovery/question', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body
    if (!username || !email) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم والبريد الإلكتروني' })
      return
    }

    const result = await query(
      'SELECT security_question FROM users WHERE username = $1 AND recovery_email = $2 AND is_active = TRUE',
      [username, email]
    )

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'لم يتم العثور على بيانات مطابقة' })
      return
    }

    const question = result.rows[0].security_question
    if (!question) {
      res.status(400).json({ error: 'لم يتم إعداد سؤال الأمان لهذا الحساب' })
      return
    }

    res.send(question)
  } catch (err) {
    console.error('[AUTH] getRecoveryQuestion error:', err)
    res.status(500).json({ error: 'فشلت العملية' })
  }
})

authRouter.post('/recovery/reset', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, answer, newPassword } = req.body
    if (!username || !answer || !newPassword) {
      res.status(400).json({ error: 'جميع الحقول مطلوبة' })
      return
    }

    const result = await query(
      'SELECT id, security_answer_hash FROM users WHERE username = $1 AND is_active = TRUE',
      [username]
    )

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'المستخدم غير موجود' })
      return
    }

    const user = result.rows[0]
    if (!user.security_answer_hash) {
      res.status(400).json({ error: 'لم يتم إعداد سؤال الأمان لهذا الحساب' })
      return
    }

    const valid = await bcrypt.compare(answer.trim(), user.security_answer_hash)
    if (!valid) {
      res.status(400).json({ error: 'الإجابة غير صحيحة' })
      return
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user.id]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[AUTH] verifyAndReset error:', err)
    res.status(500).json({ error: 'فشلت عملية إعادة تعيين كلمة المرور' })
  }
})

authRouter.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    // Revoke the current token (H-08)
    if (auth.jti) {
      revokeToken(auth.jti)
    }
    // Revoke CSRF token
    const xsrfToken = req.cookies['XSRF-TOKEN']
    if (xsrfToken) {
      revokeCsrfToken(xsrfToken)
    }
    // Update last login log with logout time
    await query(
      `UPDATE user_login_logs SET logout_time = NOW()
       WHERE user_id = $1 AND logout_time IS NULL
       ORDER BY login_time DESC LIMIT 1`,
      [auth.userId]
    )
    await logActivity(auth.username, 'LOGOUT', 'auth', 'تسجيل خروج', {
      userId: auth.userId,
      companyId: auth.companyId
    })
  } catch (e) {
    console.error('[LOGOUT] Log error:', e)
  }
  res.json({ success: true })
})

authRouter.get('/session', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyResult = await query('SELECT trial_expires_at FROM companies WHERE id = $1', [
      req.auth!.companyId
    ])
    let trialExpired = false
    let trialExpiresAt = null
    let subscriptionStatus = 'trial'
    if (companyResult.rows.length > 0) {
      trialExpiresAt = companyResult.rows[0].trial_expires_at
      trialExpired = new Date(trialExpiresAt) < new Date()
    }
    // Check real subscription
    if (req.auth!.companyId === '00000000-0000-0000-0000-000000000000') {
      subscriptionStatus = 'lifetime'
    } else {
      const subCheck = await query(
        `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [req.auth!.companyId]
      )
      if (subCheck.rows.length > 0) {
        subscriptionStatus = subCheck.rows[0].status
      }
    }
    const permissions = await getUserPermissions(
      req.auth!.companyId,
      req.auth!.userId,
      req.auth!.roleKey
    )

    res.json({
      id: req.auth!.userId,
      userId: req.auth!.userId,
      username: req.auth!.username,
      roleKey: req.auth!.roleKey,
      companyId: req.auth!.companyId,
      trialExpired,
      trialExpiresAt,
      subscriptionStatus,
      isLocked: false,
      permissions
    })
  } catch (err) {
    console.error('[AUTH] Session error:', err)
    res.status(500).json({ error: 'فشل جلب بيانات الجلسة' })
  }
})

authRouter.put(
  '/password',
  authMiddleware,
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body
      if (!oldPassword || !newPassword) {
        res.status(400).json({ error: 'كلمة المرور القديمة والجديدة مطلوبتان' })
        return
      }
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [
        req.auth!.userId
      ])
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'المستخدم غير موجود' })
        return
      }
      const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash)
      if (!valid) {
        res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' })
        return
      }
      const hash = await bcrypt.hash(newPassword, 12)
      await query(
        'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
        [hash, req.auth!.userId]
      )
      res.json({ success: true })
    } catch (err) {
      console.error('[AUTH] Password change error:', err)
      res.status(500).json({ error: 'فشل تغيير كلمة المرور' })
    }
  }
)

authRouter.post('/lock', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true })
})

authRouter.post('/unlock', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true })
})

// Google OAuth client
let googleClient: OAuth2Client | null = null
function getGoogleClient(): OAuth2Client | null {
  if (googleClient) return googleClient
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.log('[AUTH] Google OAuth not configured')
    return null
  }
  googleClient = new OAuth2Client(
    clientId,
    clientSecret,
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/auth/google/callback'
  )
  return googleClient
}

authRouter.get('/google', (_req: Request, res: Response) => {
  const client = getGoogleClient()
  if (!client) {
    res.status(500).json({ error: 'تسجيل الدخول عبر Google غير مُعد' })
    return
  }
  // Create cookie-bound HMAC state — binds OAuth to this browser
  const state = createOAuthState(res)
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'consent',
    state
  })
  res.redirect(url)
})

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'رمز التفويض مفقود' })
    return
  }

  // Validate state: cookie-bound HMAC verification
  if (!verifyOAuthState(req, res)) {
    res.status(400).json({ error: 'معلمة الأمان state غير صالحة أو مفقودة — يرجى إعادة المحاولة' })
    return
  }

  const client = getGoogleClient()
  if (!client) {
    res.status(500).json({ error: 'تسجيل الدخول عبر Google غير مُعد' })
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  // Helper: redirect with properly encoded error message
  const redirectToLogin = (error: string, message: string) => {
    const encodedMessage = encodeURIComponent(message)
    res.redirect(`${frontendUrl}/#/login?error=${error}&message=${encodedMessage}`)
  }

  try {
    const { tokens } = await client.getToken(code)
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      res.redirect(`${frontendUrl}/#/login?error=google_failed`)
      return
    }

    const googleEmail = payload.email
    const googleName = payload.name || googleEmail.split('@')[0]
    const googleSub = payload.sub // Google's unique user ID

    // STEP 1: Find existing user by google_user_id OR recovery_email
    let userResult = await query(
      `SELECT u.id, u.username, u.role_key, u.company_id, u.is_active, u.is_suspended, u.google_user_id,
              c.is_deleted, c.is_verified, c.trial_expires_at
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.google_user_id = $1 OR u.recovery_email = $2
       ORDER BY u.created_at DESC LIMIT 1`,
      [googleSub, googleEmail]
    )

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0]

      // 1) Check if company is soft-deleted
      if (user.is_deleted) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - الحساب محذوف'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'حساب محذوف', req)
        redirectToLogin('AccountSuspended', 'تم إيقاف هذا الحساب. يرجى التواصل مع إدارة النظام.')
        return
      }

      // 2) Check if user is deactivated
      if (!user.is_active) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - الحساب معطل'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'حساب معطل', req)
        redirectToLogin('AccountSuspended', 'تم تعطيل حسابك. يرجى التواصل مع الدعم الفني للمساعدة.')
        return
      }

      // 3) Check if user is explicitly suspended
      if (user.is_suspended) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - المستخدم معلق'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'مستخدم معلق', req)
        redirectToLogin('AccountSuspended', 'تم تعليق حسابك. يرجى التواصل مع الدعم الفني للمساعدة.')
        return
      }

      // 4) Check subscription status
      let subscriptionStatus = 'trial'
      const subCheck = await query(
        `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.company_id]
      )
      if (subCheck.rows.length > 0) {
        subscriptionStatus = subCheck.rows[0].status
      }

      if (subscriptionStatus === 'past_due') {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - الاشتراك معلق'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'اشتراك معلق', req)
        redirectToLogin(
          'AccountSuspended',
          'تم تعليق اشتراكك. يرجى التواصل مع الدعم الفني للمساعدة.'
        )
        return
      }

      if (subscriptionStatus === 'canceled') {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - الاشتراك ملغي'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'اشتراك ملغي', req)
        redirectToLogin(
          'AccountSuspended',
          'تم إلغاء اشتراكك. يرجى التواصل مع الدعم الفني للمساعدة.'
        )
        return
      }

      if (subscriptionStatus === 'expired') {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة دخول Google فاشلة - الاشتراك منتهي'
        )
        await logLoginAttempt(user.id, user.company_id, false, 'اشتراك منتهي', req)
        redirectToLogin('AccountSuspended', 'انتهت صلاحية اشتراكك. يرجى التجديد للمتابعة.')
        return
      }

      // 5) Check if trial period expired
      const companyRes = await query('SELECT trial_expires_at FROM companies WHERE id = $1', [
        user.company_id
      ])
      let trialExpired = false
      if (companyRes.rows.length > 0) {
        trialExpired = new Date(companyRes.rows[0].trial_expires_at) < new Date()
      }

      // Update google_user_id if not yet stored
      if (!user.google_user_id && googleSub) {
        await query('UPDATE users SET google_user_id = $1, updated_at = NOW() WHERE id = $2', [
          googleSub,
          user.id
        ])
      }

      // All checks passed — generate token
      const token = generateToken({
        userId: user.id,
        companyId: user.company_id,
        username: user.username,
        roleKey: user.role_key,
        trialExpired,
        subscriptionStatus
      })

      await logActivity(user.username, 'LOGIN_SUCCESS', 'auth', 'تسجيل دخول عبر Google', {
        userId: user.id,
        companyId: user.company_id,
        roleKey: user.role_key
      })
      await logLoginAttempt(user.id, user.company_id, true, undefined, req)

      sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@b2blaw.local',
        subject: `🔑 تسجيل دخول عبر Google: ${googleName}`,
        text: `مرحباً،\n\nقام مستخدم مسجل مسبقاً بتسجيل الدخول عبر Google:\n\n- الاسم: ${googleName}\n- البريد الإلكتروني: ${googleEmail}\n- وقت الدخول: ${new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })}\n\nشكراً لك.`
      }).catch((e) => {
        console.error('Failed to notify admin of Google login:', e)
      })

      const tempCode = require('crypto').randomBytes(32).toString('hex')
      oauthCodes.set(tempCode, { token, createdAt: Date.now() })

      res.redirect(`${frontendUrl}/#/login?code=${tempCode}`)
      return
    }

    // STEP 2: No user found by google_user_id or recovery_email
    // Check if the email exists in companies table — prevent duplicate accounts
    const existingCompany = await query(
      `SELECT c.id, c.is_deleted, c.is_verified, c.trial_expires_at
       FROM companies c
       WHERE c.email = $1`,
      [googleEmail]
    )

    if (existingCompany.rows.length > 0) {
      const company = existingCompany.rows[0]

      // Block if company is soft-deleted
      if (company.is_deleted) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة تسجيل Google فاشلة - الشركة محذوفة'
        )
        redirectToLogin('AccountSuspended', 'تم إيقاف هذا الحساب. يرجى التواصل مع إدارة النظام.')
        return
      }

      // Check subscription status of the existing company
      let subscriptionStatus = 'trial'
      const subCheck = await query(
        `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [company.id]
      )
      if (subCheck.rows.length > 0) {
        subscriptionStatus = subCheck.rows[0].status
      }

      if (
        subscriptionStatus === 'past_due' ||
        subscriptionStatus === 'canceled' ||
        subscriptionStatus === 'expired'
      ) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          `محاولة تسجيل Google فاشلة - الاشتراك ${subscriptionStatus}`
        )
        redirectToLogin(
          'AccountSuspended',
          'لا يمكن إنشاء حساب جديد. الحساب موجود مسبقاً وحالته: ' +
            (subscriptionStatus === 'past_due'
              ? 'معلق'
              : subscriptionStatus === 'canceled'
                ? 'ملغي'
                : 'منتهي') +
            '. يرجى التواصل مع إدارة النظام.'
        )
        return
      }

      // Check if any user in this company is deactivated (all users suspended = blocked)
      const activeUsers = await query(
        `SELECT id FROM users WHERE company_id = $1 AND is_active = TRUE LIMIT 1`,
        [company.id]
      )
      if (activeUsers.rows.length === 0) {
        await logActivity(
          googleEmail,
          'LOGIN_FAILED',
          'auth',
          'محاولة تسجيل Google فاشلة - جميع المستخدمين معطلين'
        )
        redirectToLogin('AccountSuspended', 'تم تعطيل هذا الحساب. يرجى التواصل مع إدارة النظام.')
        return
      }

      // Company exists, is active, has active users — but no user linked to this Google account
      // BLOCK: do NOT create a duplicate user. Tell them to log in with existing credentials.
      await logActivity(
        googleEmail,
        'LOGIN_FAILED',
        'auth',
        'محاولة تسجيل Google فاشلة - البريد مسجل مسبقاً بحساب آخر'
      )
      redirectToLogin(
        'AccountSuspended',
        'هذا البريد الإلكتروني مسجل مسبقاً بحساب موجود. يرجى تسجيل الدخول bằng بيانات الحساب الأصلي.'
      )
      return
    }

    // STEP 3: Brand new user — no matching user or company found
    // Create company + user + trial subscription
    const companyId = uuidv4()
    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30)
    await query(
      'INSERT INTO companies (id, name, email, is_verified, trial_expires_at) VALUES ($1, $2, $3, TRUE, $4)',
      [companyId, googleName, googleEmail, trialExpiresAt]
    )
    // Seed firm_data defaults
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'officeName',
      JSON.stringify(googleName)
    ])
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'theme',
      JSON.stringify('light')
    ])
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'activityLogRetentionDays',
      JSON.stringify(365)
    ])
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'taskNotificationsEnabled',
      JSON.stringify(true)
    ])
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'taskNotificationLeadDays',
      JSON.stringify(1)
    ])

    // Create trial subscription
    try {
      const planResult = await query('SELECT id FROM plans LIMIT 1')
      const planId = planResult.rows.length > 0 ? planResult.rows[0].id : null
      await query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'trial', NOW(), $4, NOW(), $4)`,
        [uuidv4(), companyId, planId, trialExpiresAt]
      )
    } catch (subErr) {
      console.error('[GOOGLE_AUTH] Failed to create trial subscription:', subErr)
    }

    // Create user
    let username: string
    const baseUsername = googleEmail
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .substring(0, 20)
    username = baseUsername
    let counter = 1
    while (true) {
      const dup = await query('SELECT id FROM users WHERE username = $1', [username])
      if (dup.rows.length === 0) break
      username = baseUsername.substring(0, 17) + counter
      counter++
    }
    const userId = uuidv4()
    const randomPass = uuidv4().replace(/-/g, '').substring(0, 16)
    const passwordHash = await bcrypt.hash(randomPass, 12)
    await query(
      `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, google_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, $8, NOW())`,
      [userId, companyId, username, googleName, passwordHash, 'admin', googleEmail, googleSub]
    )

    notifyAdminOfNewRegistration({
      name: googleName,
      email: googleEmail,
      method: 'Google',
      trialExpiresAt
    }).catch((e) => {
      console.error('Failed to notify admin of Google signup:', e)
    })

    const newUser = await query('SELECT id, username, role_key FROM users WHERE id = $1', [userId])
    const user = newUser.rows[0]

    let subscriptionStatus = 'trial'
    const subCheck = await query(
      `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    )
    if (subCheck.rows.length > 0) {
      subscriptionStatus = subCheck.rows[0].status
    }

    const token = generateToken({
      userId: user.id,
      companyId,
      username: user.username,
      roleKey: user.role_key,
      trialExpired: trialExpiresAt < new Date(),
      subscriptionStatus
    })

    await logActivity(user.username, 'LOGIN_SUCCESS', 'auth', 'تسجيل دخول جديد عبر Google', {
      userId: user.id,
      companyId,
      roleKey: user.role_key
    })
    await logLoginAttempt(user.id, companyId, true, undefined, req)

    const tempCode2 = require('crypto').randomBytes(32).toString('hex')
    oauthCodes.set(tempCode2, { token, createdAt: Date.now() })

    res.redirect(`${frontendUrl}/#/login?code=${tempCode2}`)
  } catch (err) {
    console.error('[AUTH] Google OAuth callback error:', err)
    res.redirect(`${frontendUrl}/#/login?error=google_failed`)
  }
})

authRouter.post('/check-availability', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { field, value } = req.body
    if (!field || !value) {
      res.status(400).json({ error: 'بعض المعالم مفقودة' })
      return
    }

    if (field === 'phone') {
      const exists = await query('SELECT id FROM companies WHERE phone = $1', [value.trim()])
      res.json({ available: exists.rows.length === 0 })
    } else if (field === 'email') {
      const exists = await query('SELECT id FROM companies WHERE email = $1', [
        value.trim().toLowerCase()
      ])
      res.json({ available: exists.rows.length === 0 })
    } else if (field === 'username') {
      const exists = await query('SELECT id FROM users WHERE username = $1', [value.trim()])
      res.json({ available: exists.rows.length === 0 })
    } else {
      res.status(400).json({ error: 'الحقل غير صالح' })
    }
  } catch (err) {
    console.error('[AUTH] Check availability error:', err)
    res.status(500).json({ error: 'فشل التحقق' })
  }
})

authRouter.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    let { companyName, username, email, phone, password } = req.body

    // 0. Sanitization and Normalization
    companyName = (companyName || '').trim()
    username = (username || '').trim()
    email = (email || '').trim().toLowerCase()
    phone = (phone || '').trim().replace(/\s+/g, '')
    password = password || ''

    // XSS Sanitization for office name and length limit
    companyName = companyName.replace(/[<>"'&]/g, '')
    if (companyName.length > 150) {
      companyName = companyName.substring(0, 150)
    }

    if (!companyName || !username || !email || !phone || !password) {
      res.status(400).json({ error: 'جميع الحقول مطلوبة', message: 'جميع الحقول مطلوبة' })
      return
    }

    // Regex Rules
    const phoneRegex = /^05\d{8}$/
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/
    // Password: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    if (!phoneRegex.test(phone)) {
      res
        .status(400)
        .json({ error: 'InvalidPhone', message: 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05' })
      return
    }
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'InvalidEmail', message: 'صيغة البريد الإلكتروني غير صحيحة' })
      return
    }
    if (!usernameRegex.test(username)) {
      res.status(400).json({
        error: 'InvalidUsername',
        message: 'اسم المستخدم يجب أن يكون باللغة الإنجليزية (من 4 إلى 20 حرف)'
      })
      return
    }
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        error: 'WeakPassword',
        message: 'يجب أن تحتوي كلمة المرور على حرف كبير وصغير ورقم ورمز خاص، وبحد أدنى 8 أحرف'
      })
      return
    }

    // 1. Verify username uniqueness globally
    const checkUser = await query('SELECT id FROM users WHERE username = $1', [username])
    if (checkUser.rows.length > 0) {
      await logActivity(
        username,
        'REGISTER_FAILED',
        'auth',
        'فشل التسجيل - اسم المستخدم موجود مسبقاً'
      )
      sendEmail({
        to: 'slaehmap@gmail.com',
        subject: `⚠️ محاولة تسجيل مكررة (اسم المستخدم موجود): ${username}`,
        text: `مرحباً أستاذ صالح،\n\nحاول مستخدم التسجيل باسم مستخدم موجود مسبقاً:\n\n- الاسم/المكتب: ${companyName}\n- اسم المستخدم: ${username}\n- البريد الإلكتروني: ${email}\n- رقم الهاتف: ${phone}\n\nشكراً لك.`
      }).catch(() => {})
      res.status(400).json({ error: 'UsernameAlreadyExists', message: 'اسم المستخدم مسجل مسبقاً' })
      return
    }

    // 2. Verify email uniqueness globally across companies
    const checkEmail = await query('SELECT id FROM companies WHERE email = $1', [email])
    if (checkEmail.rows.length > 0) {
      await logActivity(
        username,
        'REGISTER_FAILED',
        'auth',
        'فشل التسجيل - البريد الإلكتروني موجود مسبقاً'
      )
      sendEmail({
        to: 'slaehmap@gmail.com',
        subject: `⚠️ محاولة تسجيل مكررة (البريد الإلكتروني موجود): ${email}`,
        text: `مرحباً أستاذ صالح،\n\nحاول مستخدم التسجيل ببريد إلكتروني موجود مسبقاً:\n\n- الاسم/المكتب: ${companyName}\n- البريد الإلكتروني: ${email}\n- رقم الهاتف: ${phone}\n- اسم المستخدم: ${username}\n\nشكراً لك.`
      }).catch(() => {})
      res
        .status(400)
        .json({ error: 'EmailAlreadyExists', message: 'البريد الإلكتروني مسجل مسبقاً' })
      return
    }

    // 3. Verify phone uniqueness globally across companies
    const checkPhone = await query('SELECT id FROM companies WHERE phone = $1', [phone])
    if (checkPhone.rows.length > 0) {
      await logActivity(
        username,
        'REGISTER_FAILED',
        'auth',
        'فشل التسجيل - رقم الهاتف موجود مسبقاً'
      )
      sendEmail({
        to: 'slaehmap@gmail.com',
        subject: `⚠️ محاولة تسجيل مكررة (رقم الهاتف موجود): ${phone}`,
        text: `مرحباً أستاذ صالح،\n\nحاول مستخدم التسجيل برقم هاتف موجود مسبقاً:\n\n- الاسم/المكتب: ${companyName}\n- رقم الهاتف: ${phone}\n- البريد الإلكتروني: ${email}\n- اسم المستخدم: ${username}\n\nشكراً لك.`
      }).catch(() => {})
      res.status(400).json({ error: 'PhoneAlreadyExists', message: 'رقم الجوال مسجل مسبقاً' })
      return
    }

    const companyId = uuidv4()
    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30) // 30 days trial

    // Generate 6-digit random code (OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 4-7. Create company, user, firm_data, and subscription in a single transaction
    const userId = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)

    const client = await getClient()
    try {
      await client.query('BEGIN')

      // 4. Create company in database (needs OTP verification)
      await client.query(
        'INSERT INTO companies (id, name, email, phone, is_verified, verification_code, trial_expires_at) VALUES ($1, $2, $3, $4, FALSE, $5, $6)',
        [companyId, companyName, email, phone, otpCode, trialExpiresAt]
      )

      // 5. Create default admin user
      await client.query(
        `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, $7, NOW())`,
        [userId, companyId, username, 'مدير النظام', passwordHash, 'admin', email]
      )

      // 6. Seed basic firm_data settings so the app has configuration values
      await client.query(
        'INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)',
        [uuidv4(), companyId, 'officeName', JSON.stringify(companyName)]
      )
      await client.query(
        'INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)',
        [uuidv4(), companyId, 'theme', JSON.stringify('light')]
      )
      await client.query(
        'INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)',
        [uuidv4(), companyId, 'activityLogRetentionDays', JSON.stringify(365)]
      )
      await client.query(
        'INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)',
        [uuidv4(), companyId, 'taskNotificationsEnabled', JSON.stringify(true)]
      )
      await client.query(
        'INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)',
        [uuidv4(), companyId, 'taskNotificationLeadDays', JSON.stringify(1)]
      )

      // 7. Create trial subscription record
      const planResult = await client.query('SELECT id FROM plans LIMIT 1')
      const planId = planResult.rows.length > 0 ? planResult.rows[0].id : null
      await client.query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'trial', NOW(), $4, NOW(), $4)`,
        [uuidv4(), companyId, planId, trialExpiresAt]
      )

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      console.error('[REGISTER] Transaction failed, rolled back:', txErr)
      throw txErr
    } finally {
      client.release()
    }

    // 8. Send OTP code (fire-and-forget — don't block registration)
    const smtpAvailable = getTransporter() !== null
    sendOTP(email, phone, otpCode)

    await logActivity(
      username,
      'REGISTER_SUCCESS',
      'auth',
      'تسجيل شركة جديدة',
      {
        companyName,
        email,
        phone,
        companyId
      },
      companyId
    )

    // Notify the admin of new registration attempt (before OTP verification)
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'slaehmap@gmail.com',
      subject: `⏳ محاولة تسجيل جديدة في B2B Lawyer - ${companyName}`,
      text: `مرحباً،\n\nبدأ مستخدم جديد عملية التسجيل (لم يتم التفعيل بـ OTP بعد):\n\n- اسم المكتب: ${companyName}\n- البريد الإلكتروني: ${email}\n- الهاتف: ${phone}\n\nيمكنك الاتصال بالمستخدم لمساعدته في حال واجه مشاكل في التفعيل.`
    }).catch((e) => {
      console.error('Failed to notify admin of registration attempt:', e)
    })

    // Return OTP in response in development mode to allow verification without real email
    const devOtp = process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}
    res.status(201).json({ success: true, companyId, username, ...devOtp })
  } catch (err) {
    console.error('[AUTH] Registration error:', err)
    res.status(500).json({ error: 'فشل التسجيل' })
  }
})

authRouter.post('/verify', authRateLimiter, otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, code } = req.body
    if (!username || !code) {
      res.status(400).json({ error: 'اسم المستخدم والرمز مطلوبان' })
      return
    }

    // Find the user and their company ID
    const userResult = await query('SELECT company_id FROM users WHERE username = $1', [username])
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'UserNotFound' })
      return
    }

    const companyId = userResult.rows[0].company_id

    // Get the company details
    const companyResult = await query(
      'SELECT verification_code, is_verified FROM companies WHERE id = $1',
      [companyId]
    )
    if (companyResult.rows.length === 0) {
      res.status(404).json({ error: 'CompanyNotFound' })
      return
    }

    const company = companyResult.rows[0]
    if (company.is_verified) {
      res.json({ success: true, message: 'الحساب مُفعل بالفعل' })
      return
    }

    if (company.verification_code !== code) {
      res.status(400).json({ error: 'InvalidCode' })
      return
    }

    // Activate/Verify the company
    await query('UPDATE companies SET is_verified = TRUE, verification_code = NULL WHERE id = $1', [
      companyId
    ])

    await logActivity(
      username,
      'VERIFY_SUCCESS',
      'auth',
      'تم تفعيل الحساب',
      { companyId },
      companyId
    )

    // Notify the admin of manual signup verification completion
    query('SELECT name, email, phone, trial_expires_at FROM companies WHERE id = $1', [companyId])
      .then((infoRes) => {
        if (infoRes.rows.length > 0) {
          const { name, email, phone, trial_expires_at } = infoRes.rows[0]
          return notifyAdminOfNewRegistration({
            name,
            email,
            phone,
            method: 'Manual',
            trialExpiresAt: new Date(trial_expires_at)
          })
        }
        return Promise.resolve()
      })
      .catch((e) => {
        console.error('Failed to notify admin of manual signup verification:', e)
      })

    res.json({ success: true, message: 'تم تفعيل الحساب بنجاح' })
  } catch (err) {
    console.error('[AUTH] Verification error:', err)
    res.status(500).json({ error: 'فشل التحقق' })
  }
})

// ============================================================
// 12. مسارات المصادقة الثنائية (MFA)
// ============================================================

authRouter.post(
  '/verify-mfa',
  authRateLimiter,
  otpRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { userId, code } = req.body
      if (!userId || !code) {
        res.status(400).json({ error: 'يرجى إدخال رمز التحقق' })
        return
      }

      const result = await query('SELECT * FROM users WHERE id = $1', [userId])
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'المستخدم غير موجود' })
        return
      }

      const user = result.rows[0]
      if (!user.two_factor_enabled || !user.two_factor_secret) {
        res.status(400).json({ error: 'المصادقة الثنائية غير مفعلة لهذا الحساب' })
        return
      }

      const isValid = verifyToken(user.two_factor_secret, code)
      if (!isValid) {
        res.status(401).json({ error: 'رمز التحقق غير صحيح' })
        return
      }

      // Check trial expiration & subscription
      let trialExpired = false
      let trialExpiresAt = null
      const companyResult = await query(
        'SELECT trial_expires_at, is_deleted FROM companies WHERE id = $1',
        [user.company_id]
      )
      if (companyResult.rows.length > 0) {
        const company = companyResult.rows[0]
        if (company.is_deleted) {
          res.status(403).json({ error: 'تم تعطيل حسابك' })
          return
        }
        trialExpiresAt = company.trial_expires_at
        trialExpired = new Date(trialExpiresAt) < new Date()
      }

      let subscriptionStatus = 'trial'
      const subCheck = await query(
        `SELECT status FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.company_id]
      )
      if (subCheck.rows.length > 0) {
        subscriptionStatus = subCheck.rows[0].status
      }

      const token = generateToken({
        userId: user.id,
        companyId: user.company_id,
        username: user.username,
        roleKey: user.role_key,
        trialExpired,
        subscriptionStatus
      })

      const permissions = await getUserPermissions(user.company_id, user.id, user.role_key)
      const csrfToken = generateCsrfToken(req, res)

      res.json({
        token,
        csrfToken,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          roleKey: user.role_key,
          trialExpired,
          subscriptionStatus
        },
        permissions
      })
    } catch (err) {
      console.error('[MFA] Verify error:', err)
      res.status(500).json({ error: 'فشل التحقق من رمز المصادقة الثنائية' })
    }
  }
)

authRouter.post('/mfa/setup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const result = await query('SELECT username FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'المستخدم غير موجود' })
      return
    }
    const username = result.rows[0].username
    const secret = generateSecret()
    const qrCodeUrl = getQrCodeUrl(username, secret)

    res.json({ secret, qrCodeUrl })
  } catch (err) {
    console.error('[MFA] Setup error:', err)
    res.status(500).json({ error: 'فشلت تهيئة المصادقة الثنائية' })
  }
})

authRouter.post('/mfa/enable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const { secret, code } = req.body
    if (!secret || !code) {
      res.status(400).json({ error: 'البيانات غير مكتملة' })
      return
    }

    const isValid = verifyToken(secret, code)
    if (!isValid) {
      res.status(400).json({ error: 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى' })
      return
    }

    await query(
      'UPDATE users SET two_factor_secret = $1, two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $2',
      [secret, userId]
    )

    res.json({ success: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' })
  } catch (err) {
    console.error('[MFA] Enable error:', err)
    res.status(500).json({ error: 'فشل تفعيل المصادقة الثنائية' })
  }
})

authRouter.post('/mfa/disable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const { code } = req.body

    const result = await query(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'المستخدم غير موجود' })
      return
    }
    const user = result.rows[0]
    if (!user.two_factor_enabled) {
      res.json({ success: true, message: 'المصادقة الثنائية غير مفعلة بالفعل' })
      return
    }

    if (!code) {
      res.status(400).json({ error: 'يرجى إدخال رمز التحقق لإلغاء التفعيل' })
      return
    }

    const isValid = verifyToken(user.two_factor_secret, code)
    if (!isValid) {
      res.status(400).json({ error: 'رمز التحقق غير صحيح، فشل إلغاء تفعيل المصادقة الثنائية' })
      return
    }

    await query(
      'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE, updated_at = NOW() WHERE id = $2',
      [userId]
    )

    res.json({ success: true, message: 'تم إلغاء تفعيل المصادقة الثنائية بنجاح' })
  } catch (err) {
    console.error('[MFA] Disable error:', err)
    res.status(500).json({ error: 'فشل إلغاء تفعيل المصادقة الثنائية' })
  }
})

// Exchange temporary OAuth code for JWT (C-05 fix: avoids JWT in URL)
// Security layers after CSRF exemption:
//   1. authRateLimiter — IP-based throttling (50 req / 15 min)
//   2. code must be a non-empty string
//   3. code must exist in oauthCodes map (crypto-random 256-bit, single-use)
//   4. code must not be expired (60 s TTL)
//   5. code is deleted immediately on first lookup — anti-replay
authRouter.post('/exchange', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.body
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'الرمز مطلوب' })
      return
    }
    const entry = oauthCodes.get(code)
    if (!entry || Date.now() - entry.createdAt > 60_000) {
      oauthCodes.delete(code)
      res.status(401).json({ error: 'الرمز منتهي الصلاحية أو غير صالح' })
      return
    }
    oauthCodes.delete(code)
    const csrfToken = generateCsrfToken(req, res)
    res.json({ token: entry.token, csrfToken })
  } catch (err) {
    console.error('[AUTH] Exchange error:', err)
    res.status(500).json({ error: 'فشل تبادل الرمز' })
  }
})

