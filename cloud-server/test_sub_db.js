const { query } = require('./dist/db/connection')

async function run() {
  try {
    const res = await query('SELECT * FROM "__drizzle_migrations"')
    console.log('SUCCESS! __drizzle_migrations exists. Content:', res.rows)
  } catch (err) {
    console.error('ERROR querying __drizzle_migrations:', err.message)
  }
}

run().catch(console.error)
