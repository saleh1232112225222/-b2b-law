const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT u.username, c.verification_code, c.email
      FROM users u 
      JOIN companies c ON u.company_id = c.id 
      WHERE c.is_verified = false 
      ORDER BY u.created_at DESC 
      LIMIT 1;
    `);
    if (res.rows.length > 0) {
      console.log(JSON.stringify(res.rows[0]));
    } else {
      console.log(JSON.stringify({ error: 'No unverified users found' }));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
