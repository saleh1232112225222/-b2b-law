import { closePool, runMigrations } from './connection'
import { runExtraMigrations } from './migrate_extra'

async function migrate() {
  console.log('Running canonical database migrations...')
  await runMigrations()
  await runExtraMigrations()
  console.log('Migrations complete.')
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exitCode = 1
  })
  .finally(closePool)
