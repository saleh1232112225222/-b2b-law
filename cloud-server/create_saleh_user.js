const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1390@127.0.0.1:5432/b2b_law'
  })

  const username = 'saleh'
  const password = 'saleh1390'
  const passwordHash = await bcrypt.hash(password, 12)
  const companyId = '00000000-0000-0000-0000-000000000000'

  // Check if user already exists
  const check = await pool.query('SELECT id FROM users WHERE username = $1', [username])
  if (check.rows.length > 0) {
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE username = $2',
      [passwordHash, username]
    )
    console.log(`✅ Updated existing user: ${username} with password: ${password}`)
  } else {
    const userId = require('crypto').randomUUID()
    await pool.query(
      `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, $7, NOW())`,
      [userId, companyId, username, 'صالح', passwordHash, 'admin', 'slaehmap@gmail.com']
    )
    console.log(`✅ Created new user: ${username} with password: ${password}`)
  }

  await pool.end()
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
