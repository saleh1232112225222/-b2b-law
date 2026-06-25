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
}
