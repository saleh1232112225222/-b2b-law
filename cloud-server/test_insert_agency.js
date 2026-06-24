const { Client } = require('pg')
const { v4: uuidv4 } = require('uuid')

const client = new Client({
  connectionString:
    'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: {
    rejectUnauthorized: false
  }
})

async function run() {
  try {
    await client.connect()
    console.log('Connected successfully to Render Postgres!')

    const companyId = '5c20faad-2432-40fb-a5fd-cdb80de03886' // company_id of user slaehmap

    // Find a client id to reference
    const clientsRes = await client.query('SELECT id FROM clients WHERE company_id = $1 LIMIT 1', [
      companyId
    ])
    if (clientsRes.rows.length === 0) {
      console.error('No clients found. Please create a client first.')
      return
    }
    const clientId = clientsRes.rows[0].id

    // Find user slaehmap id
    const usersRes = await client.query(
      'SELECT id FROM users WHERE username = $1 AND company_id = $2',
      ['slaehmap', companyId]
    )
    const userId = usersRes.rows[0]?.id

    const agencyData = {
      id: uuidv4(),
      company_id: companyId,
      client_id: clientId,
      agency_number: '464654',
      date: '2026-06-07',
      expiry_date: '2026-07-11',
      court: 'بيب',
      notes: 'بيب',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const keys = Object.keys(agencyData)
    const values = Object.values(agencyData)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
    const columns = keys.join(', ')

    const queryStr = `INSERT INTO agencies (${columns}) VALUES (${placeholders}) RETURNING *`
    console.log('Executing query:', queryStr)

    const res = await client.query(queryStr, values)
    console.log('Insertion successful!')
    console.log(res.rows[0])

    // Clean up
    await client.query('DELETE FROM agencies WHERE id = $1', [agencyData.id])
    console.log('Cleaned up test agency.')
  } catch (err) {
    console.error('Insertion failed with error:', err)
  } finally {
    await client.end()
  }
}

run()
