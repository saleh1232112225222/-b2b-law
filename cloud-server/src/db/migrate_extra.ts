// DEPRECATED: All extra tables are now handled by Drizzle schema definitions.
// The Drizzle migration from `drizzle-kit generate` covers all 51 tables.
// This file is kept for reference only. Import is removed from index.ts.

import { query } from './connection'

export async function runExtraMigrations() {
  console.log('[MIGRATE_EXTRA] All tables handled by Drizzle — skipping legacy DDL migration')
}
