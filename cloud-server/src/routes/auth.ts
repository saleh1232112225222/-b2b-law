import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { OAuth2Client } from 'google-auth-library'
import { query } from '../db/connection'
import { generateToken, authMiddleware } from '../middleware/auth'
import { sendOTP, sendEmail } from '../services/notification'

export const authRouter = Router()

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, companyId } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }

    let userQuery = `SELECT u.*, u.company_id, u.role_key FROM users u WHERE u.username = $1`
    const params: any[] = [username]

    if (companyId) {
      userQuery += ` AND u.company_id = $2`
      params.push(companyId)
    }

    const result = await query(userQuery, params)
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const user = result.rows[0]
    if (!user.is_active) {
      res.status(403).json({ error: 'Account is disabled' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    // Check trial verification & expiration
    const companyResult = await query('SELECT is_verified, trial_expires_at FROM companies WHERE id = $1', [user.company_id])
    if (companyResult.rows.length > 0) {
      const company = companyResult.rows[0]
      if (!company.is_verified) {
        res.status(403).json({ error: 'AccountNotVerified' })
        return
      }
      const trialExpiresAt = new Date(company.trial_expires_at)
      if (trialExpiresAt < new Date()) {
        res.status(403).json({ error: 'TrialExpired' })
        return
      }
    }

    const token = generateToken({
      userId: user.id,
      companyId: user.company_id,
      username: user.username,
      roleKey: user.role_key
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        roleKey: user.role_key,
        companyId: user.company_id,
        employeeId: user.employee_id,
        mustChangePassword: user.must_change_password
      }
    })
  } catch (err) {
    console.error('[AUTH] Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true })
})

authRouter.get('/session', authMiddleware, (req: Request, res: Response) => {
  res.json({
    id: req.auth!.userId,
    username: req.auth!.username,
    roleKey: req.auth!.roleKey,
    companyId: req.auth!.companyId,
    isLocked: false
  })
})

authRouter.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Old and new password required' })
      return
    }
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.auth!.userId])
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' })
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
    res.status(500).json({ error: 'Password change failed' })
  }
})

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
    res.status(500).json({ error: 'Google OAuth not configured' })
    return
  }
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'consent'
  })
  res.redirect(url)
})

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const client = getGoogleClient()
  if (!client) {
    res.status(500).json({ error: 'Google OAuth not configured' })
    return
  }
  const { code } = req.query
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }
  try {
    const { tokens } = await client.getToken(code)
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Failed to get user info from Google' })
      return
    }
    const googleEmail = payload.email
    const googleName = payload.name || googleEmail.split('@')[0]
    // Check if a company with this email already exists
    const existing = await query('SELECT id, name FROM companies WHERE email = $1', [googleEmail])
    let companyId: string
    let username: string
    if (existing.rows.length > 0) {
      companyId = existing.rows[0].id
    } else {
      // Create a new company for this Google user
      companyId = uuidv4()
      const trialExpiresAt = new Date()
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 7)
      await query(
        'INSERT INTO companies (id, name, email, is_verified, trial_expires_at) VALUES ($1, $2, $3, TRUE, $4)',
        [companyId, googleName, googleEmail, trialExpiresAt]
      )
      // Seed firm_data defaults
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, 'officeName', JSON.stringify(googleName)
      ])
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, 'theme', JSON.stringify('light')
      ])
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, 'activityLogRetentionDays', JSON.stringify(365)
      ])
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, 'taskNotificationsEnabled', JSON.stringify(true)
      ])
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, 'taskNotificationLeadDays', JSON.stringify(1)
      ])
    }
    // Create or find user
    let userResult = await query('SELECT id, username, role_key FROM users WHERE company_id = $1 AND recovery_email = $2', [companyId, googleEmail])
    if (userResult.rows.length === 0) {
      const baseUsername = googleEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20)
      username = baseUsername
      // Ensure unique username
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
        `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, NOW())`,
        [userId, companyId, username, googleName, passwordHash, 'admin', googleEmail]
      )

      // Notify the admin of Google signup completion
      try {
        await sendEmail({
          to: 'slaehmap@gmail.com',
          subject: '🎉 مشترك جديد عبر Google في B2B Lawyer',
          text: `مرحباً أستاذ صالح،\n\nقام مشترك جديد بالتسجيل عبر Google بنجاح:\n\n- الاسم: ${googleName}\n- البريد الإلكتروني: ${googleEmail}\n\nشكراً لك.`
        })
      } catch (e) {
        console.error('Failed to notify admin of Google signup:', e)
      }

      userResult = await query('SELECT id, username, role_key FROM users WHERE id = $1', [userId])
    }
    const user = userResult.rows[0]
    const token = generateToken({
      userId: user.id,
      companyId,
      username: user.username,
      roleKey: user.role_key
    })
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/#/login?google_token=${token}`)
  } catch (err) {
    console.error('[AUTH] Google OAuth callback error:', err)
    res.status(500).json({ error: 'Google authentication failed' })
  }
})

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { companyName, username, email, phone, password } = req.body
    if (!companyName || !username || !email || !phone || !password) {
      res.status(400).json({ error: 'All fields are required' })
      return
    }

    // 1. Verify username uniqueness globally
    const checkUser = await query('SELECT id FROM users WHERE username = $1', [username])
    if (checkUser.rows.length > 0) {
      res.status(400).json({ error: 'UsernameAlreadyExists' })
      return
    }

    // 2. Verify email uniqueness globally across companies
    const checkEmail = await query('SELECT id FROM companies WHERE email = $1', [email])
    if (checkEmail.rows.length > 0) {
      res.status(400).json({ error: 'EmailAlreadyExists' })
      return
    }

    // 3. Verify phone uniqueness globally across companies
    const checkPhone = await query('SELECT id FROM companies WHERE phone = $1', [phone])
    if (checkPhone.rows.length > 0) {
      res.status(400).json({ error: 'PhoneAlreadyExists' })
      return
    }

    const companyId = uuidv4()
    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7) // 7 days trial

    // Generate 6-digit random code (OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 4. Create company in database (needs OTP verification)
    await query(
      'INSERT INTO companies (id, name, email, phone, is_verified, verification_code, trial_expires_at) VALUES ($1, $2, $3, $4, FALSE, $5, $6)',
      [companyId, companyName, email, phone, otpCode, trialExpiresAt]
    )

    // 5. Create default admin user
    const userId = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)
    await query(
      `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, $7, NOW())`,
      [userId, companyId, username, 'مدير النظام', passwordHash, 'admin', email]
    )

    // 6. Seed basic firm_data settings so the app has configuration values
    await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      companyId,
      'officeName',
      JSON.stringify(companyName)
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

    // 7. Send OTP code (fire-and-forget — don't block registration)
    sendOTP(email, phone, otpCode)

    res.status(201).json({ success: true, companyId, username })
  } catch (err) {
    console.error('[AUTH] Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { username, code } = req.body
    if (!username || !code) {
      res.status(400).json({ error: 'Username and code are required' })
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
    const companyResult = await query('SELECT verification_code, is_verified FROM companies WHERE id = $1', [companyId])
    if (companyResult.rows.length === 0) {
      res.status(404).json({ error: 'CompanyNotFound' })
      return
    }

    const company = companyResult.rows[0]
    if (company.is_verified) {
      res.json({ success: true, message: 'Account is already verified' })
      return
    }

    if (company.verification_code !== code) {
      res.status(400).json({ error: 'InvalidCode' })
      return
    }

    // Activate/Verify the company
    await query('UPDATE companies SET is_verified = TRUE, verification_code = NULL WHERE id = $1', [companyId])

    // Notify the admin of manual signup verification completion
    try {
      const infoRes = await query('SELECT name, email, phone FROM companies WHERE id = $1', [companyId])
      if (infoRes.rows.length > 0) {
        const { name, email, phone } = infoRes.rows[0]
        await sendEmail({
          to: 'slaehmap@gmail.com',
          subject: '🎉 مشترك جديد تفعيل يدوي في B2B Lawyer',
          text: `مرحباً أستاذ صالح،\n\nقام مشترك جديد بتفعيل حسابه بنجاح:\n\n- اسم المكتب: ${name}\n- البريد الإلكتروني: ${email}\n- الهاتف: ${phone}\n\nشكراً لك.`
        })
      }
    } catch (e) {
      console.error('Failed to notify admin of manual signup verification:', e)
    }

    res.json({ success: true, message: 'Account verified successfully' })
  } catch (err) {
    console.error('[AUTH] Verification error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})
