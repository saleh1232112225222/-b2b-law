const { query } = require('./dist/db/connection')
const { v4: uuidv4 } = require('uuid')

const hash = '$2a$12$mr2bHXoL1L0ktHjB57xJfu0mXBFKmRoBBEMAmU7xtMmL9JL.YxxYK'

async function setup() {
  const existing = await query('SELECT id FROM users WHERE username = $1', ['admin'])
  if (existing.rows.length > 0) {
    console.log('Admin user already exists with id:', existing.rows[0].id)
    return
  }

  const companyId = uuidv4()
  const userId = uuidv4()
  const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  await query(
    'INSERT INTO companies (id, name, email, is_verified, trial_expires_at) VALUES ($1, $2, $3, TRUE, $4)',
    [companyId, 'المطور', 'dev@b2blaw.local', expiry]
  )

  await query(
    `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, $7, NOW())`,
    [userId, companyId, 'admin', 'Admin Developer', hash, 'admin', 'dev@b2blaw.local']
  )

  console.log('Admin user created successfully!')
  console.log('Username: admin')
  console.log('Password: admin1390')
}

setup().catch((e) => console.error('Error:', e.message))
