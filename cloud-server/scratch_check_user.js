const { Client } = require('pg')

const client = new Client({
  connectionString:
    'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  try {
    await client.connect()

    console.log("Updating must_change_password to false for username='admin'...")
    const res = await client.query(`
      UPDATE users
      SET must_change_password = false
      WHERE username = 'admin';
    `)

    console.log(`Successfully updated ${res.rowCount} row(s).`)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}
run()
