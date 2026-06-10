import { query } from './connection'
import * as fs from 'fs'
import * as path from 'path'

async function migrate() {
  console.log('Running database migrations...')

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql')
  // Fallback to compiled location
  const altPath = path.join(__dirname, 'schema.sql')
  const finalPath = fs.existsSync(schemaPath) ? schemaPath : (fs.existsSync(altPath) ? altPath : path.join(__dirname, '..', '..', '..', 'cloud-migration', 'schema_postgresql.sql'))
  console.log('Schema path:', finalPath)
  const sql = fs.readFileSync(finalPath, 'utf8')

  const statements = sql
    .split(';')
    .map((s) => s.replace(/^--.*$/gm, '').trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await query(stmt)
      console.log(`  ✓ Executed: ${stmt.substring(0, 60)}...`)
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        console.log(`  - Skipped (exists): ${stmt.substring(0, 60)}...`)
      } else {
        console.error(`  ✗ Failed: ${stmt.substring(0, 60)}...`)
        console.error(`    ${err.message}`)
      }
    }
  }

  console.log('Migrations complete.')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
