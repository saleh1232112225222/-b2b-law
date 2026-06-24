const { Client } = require('pg')
const { drizzle } = require('drizzle-orm/node-postgres')
const { migrate } = require('drizzle-orm/node-postgres/migrator')
const path = require('path')

async function run() {
  // 1. Connect to default postgres database to create a temp database
  const client = new Client({
    connectionString: 'postgresql://postgres:1390@127.0.0.1:5432/postgres'
  })
  await client.connect()

  try {
    await client.query('DROP DATABASE IF EXISTS b2b_law_temp')
    await client.query('CREATE DATABASE b2b_law_temp')
    console.log('Created temporary database b2b_law_temp')
  } finally {
    await client.end()
  }

  // 2. Connect to the temp database and run Drizzle migrations
  const tempClient = new Client({
    connectionString: 'postgresql://postgres:1390@127.0.0.1:5432/b2b_law_temp'
  })
  await tempClient.connect()

  try {
    const db = drizzle(tempClient)
    const migrationsFolder = path.join(__dirname, 'dist', 'db', 'migrations')
    console.log('Running migrations on temp database using folder:', migrationsFolder)
    await migrate(db, { migrationsFolder })

    // 3. Query the drizzle.__drizzle_migrations table
    const res = await tempClient.query('SELECT * FROM "drizzle"."__drizzle_migrations"')
    console.log('--- Migration Entries ---')
    console.log(JSON.stringify(res.rows, null, 2))
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await tempClient.end()
  }

  // 4. Drop the temp database
  const cleanClient = new Client({
    connectionString: 'postgresql://postgres:1390@127.0.0.1:5432/postgres'
  })
  await cleanClient.connect()
  try {
    await cleanClient.query('DROP DATABASE IF EXISTS b2b_law_temp')
    console.log('Dropped temporary database')
  } finally {
    await cleanClient.end()
  }
}

run().catch(console.error)
