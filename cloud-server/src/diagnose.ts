import { query } from './db/connection'

async function run() {
  try {
    const usersRes = await query('SELECT COUNT(*) FROM users')
    console.log('Users count:', usersRes.rows[0].count)

    const sampleUsers = await query('SELECT * FROM users LIMIT 1')
    console.log('Sample User Keys:', Object.keys(sampleUsers.rows[0] || {}))
    console.log('Sample User:', sampleUsers.rows[0])
  } catch (err) {
    console.error('Diagnosis failed:', err)
  }
}

run()
