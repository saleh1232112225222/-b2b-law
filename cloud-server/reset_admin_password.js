// تشغيل: node reset_admin_password.js
// يعيد تعيين كلمة سر حساب المالك (admin) إلى admin1390

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

async function reset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1390@127.0.0.1:5432/b2b_law'
  })

  const passwordHash = await bcrypt.hash('admin1390', 12)
  const result = await pool.query(
    `UPDATE users SET password_hash = $1, must_change_password = FALSE
     WHERE username = 'admin' AND company_id = '00000000-0000-0000-0000-000000000000'`,
    [passwordHash]
  )

  if (result.rowCount > 0) {
    console.log('✅ تم إعادة تعيين كلمة سر المالك: admin / admin1390')
  } else {
    console.log('❌ لم يتم العثور على حساب المالك. قد تحتاج تشغيل السيرفر أولاً لينشئ الحساب.')
  }

  await pool.end()
  process.exit(0)
}

reset().catch(err => { console.error(err); process.exit(1) })
