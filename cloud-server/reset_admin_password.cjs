const { query } = require('./dist/db/connection')
const bcrypt = require('bcryptjs')

async function resetAdmin() {
  const newPassword = process.argv[2] || 'admin123'
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(newPassword, salt)

  const result = await query(
    `UPDATE users 
     SET password_hash = $1, 
         is_active = TRUE, 
         is_suspended = FALSE,
         must_change_password = FALSE 
     WHERE username = $1 OR role_key = $2 RETURNING id, username`,
    [hash, 'admin']
  )

  // Also update specific admin username
  await query(
    `UPDATE users 
     SET password_hash = $1, 
         is_active = TRUE, 
         is_suspended = FALSE 
     WHERE username = 'admin'`,
    [hash]
  )

  console.log(`✅ Success! Admin password has been reset to: ${newPassword}`)
  console.log(`Username: admin`)
  console.log(`Password: ${newPassword}`)
  process.exit(0)
}

resetAdmin().catch((err) => {
  console.error('❌ Error resetting password:', err.message)
  process.exit(1)
})
