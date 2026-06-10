import { query } from '../db/connection'
import * as bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

export async function login(companyId: string, username: string, password: string) {
  const userRes = await query(
    'SELECT * FROM users WHERE company_id = $1 AND username = $2 AND is_active = TRUE',
    [companyId, username]
  )
  if (userRes.rows.length === 0) return null

  const user = userRes.rows[0]
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return null

  const companyRes = await query('SELECT * FROM companies WHERE id = $1', [companyId])
  const company = companyRes.rows[0]

  const trialExpired = company.trial_expires_at && new Date(company.trial_expires_at) < new Date()
  const isVerified = company.is_verified

  const token = generateToken({
    userId: user.id,
    companyId: company.id,
    username: user.username,
    roleKey: user.role_key
  })

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      roleKey: user.role_key,
      mustChangePassword: user.must_change_password
    },
    trialExpired,
    isVerified
  }
}

export async function registerCompany(data: {
  name: string
  username: string
  password: string
  email?: string
  phone?: string
  fullName?: string
}) {
  const companyId = uuidv4()
  const userId = uuidv4()
  const hashedPassword = await bcrypt.hash(data.password, 10)
  const now = new Date().toISOString()
  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await query(
    `INSERT INTO companies (id, name, email, phone, trial_expires_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6)`,
    [companyId, data.name, data.email || null, data.phone || null, trialEnd, now]
  )

  await query(
    `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, created_at)
     VALUES ($1,$2,$3,$4,$5,'admin',TRUE,TRUE,$6)`,
    [userId, companyId, data.username, data.fullName || data.username, hashedPassword, now]
  )

  return { companyId, userId }
}
