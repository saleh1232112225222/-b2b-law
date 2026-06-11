const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT username, role_key, recovery_email, company_id
      FROM users 
      WHERE username = 'vod3333' OR recovery_email = 'vod48557@gmail.com';
    `);
    console.log("USERS:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
