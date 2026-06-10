const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to PG database successfully!');
    await client.query("SET session_replication_role = 'replica'");
    console.log('Successfully set session_replication_role to replica!');
  } catch (err) {
    console.error('Error setting session_replication_role:', err.message);
  } finally {
    await client.end();
  }
}

run();
