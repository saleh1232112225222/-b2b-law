import { query } from './connection'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

async function seed() {
  console.log('Seeding initial data...')

  const companyId = uuidv4()
  const adminId = uuidv4()
  const passwordHash = await bcrypt.hash('admin123', 12)

  // Seed company with a trial expiration date 100 years in the future
  const trialExpiresAt = new Date()
  trialExpiresAt.setFullYear(trialExpiresAt.getFullYear() + 100)
  await query(
    'INSERT INTO companies (id, name, email, phone, is_verified, trial_expires_at) VALUES ($1, $2, $3, $4, TRUE, $5)',
    [companyId, 'مكتب المحاماة السحابي', 'admin@b2blaw.com', '0500000000', trialExpiresAt]
  )

  // Seed default Lifetime plan and subscription to prevent licensing lock
  let planId = uuidv4()
  const checkPlan = await query("SELECT id FROM plans WHERE interval = 'lifetime' LIMIT 1")
  if (checkPlan.rows.length > 0) {
    planId = checkPlan.rows[0].id
  } else {
    await query(
      `INSERT INTO plans (id, name, name_ar, description, description_ar, interval, price, sort_order)
       VALUES ($1, 'Lifetime', 'مدى الحياة', 'One-time payment', 'دفعة واحدة، وصول مدى الحياة', 'lifetime', 2499.00, 3)`,
      [planId]
    )
  }

  const subId = uuidv4()
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setFullYear(periodEnd.getFullYear() + 100)
  await query(
    `INSERT INTO subscriptions (id, company_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, 'lifetime', $4, $5)`,
    [subId, companyId, planId, now, periodEnd]
  )

  await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
    uuidv4(),
    companyId,
    'officeName',
    'مكتب المحاماة السحابي'
  ])

  await query(
    `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [adminId, companyId, 'admin', 'المدير العام', passwordHash, 'admin', true, false]
  )

  console.log(`  ✓ Created company: ${companyId}`)
  console.log(`  ✓ Created admin user: admin / admin123`)
  console.log('Seeding complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
