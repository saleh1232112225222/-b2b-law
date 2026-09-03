import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('legacy database migration reconciliation', () => {
  it('keeps migration 0004 idempotent for schemas that were partially applied before Drizzle tracking', () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../db/migrations/0004_light_medusa.sql'), 'utf8')
    expect(sql.match(/CREATE TABLE IF NOT EXISTS/g)?.length).toBe(3)
    expect(sql.match(/ADD COLUMN IF NOT EXISTS/g)?.length).toBe(14)
    expect(sql.match(/DO \$\$/g)?.length).toBe(6)
    expect(sql.match(/EXCEPTION WHEN duplicate_object THEN NULL/g)?.length).toBe(6)
  })
})
