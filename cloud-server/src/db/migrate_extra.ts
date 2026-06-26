import { query } from './connection'

export async function runExtraMigrations() {
  console.log('[MIGRATE_EXTRA] Running extra migrations...')

  // Soft delete columns for companies table
  try {
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
    `)
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `)
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID
    `)
    console.log('[MIGRATE_EXTRA] Soft delete columns ensured for companies table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Soft delete columns migration warning:', err.message)
  }

  // Google User ID column for users table
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_user_id TEXT
    `)
    // Unique index on google_user_id (only non-null values)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_user_id 
      ON users (google_user_id) WHERE google_user_id IS NOT NULL
    `)
    console.log('[MIGRATE_EXTRA] google_user_id column and index ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] google_user_id migration warning:', err.message)
  }

  // Unique index on recovery_email to prevent duplicate accounts
  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_recovery_email 
      ON users (recovery_email) WHERE recovery_email IS NOT NULL
    `)
    console.log('[MIGRATE_EXTRA] recovery_email unique index ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] recovery_email index migration warning:', err.message)
  }

  // is_suspended column for explicit user suspension control
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE
    `)
    console.log('[MIGRATE_EXTRA] is_suspended column ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] is_suspended migration warning:', err.message)
  }
}
