const { query } = require('./dist/db/connection')

async function run() {
  const companies = await query('SELECT id, name, email FROM companies')
  console.log('--- Companies ---')
  console.log(companies.rows)

  const users = await query('SELECT id, company_id, username, role_key FROM users')
  console.log('--- Users ---')
  console.log(users.rows)
}

run().catch(console.error)
