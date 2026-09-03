import { Pool, PoolClient, QueryResult, types } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'

// Return PostgreSQL DATE columns (OID 1082) as plain string 'YYYY-MM-DD' instead of Date object (prevents T00:00:00.000Z)
types.setTypeParser(1082, (val: string) => val)

// Simple helper to load .env since we don't have dotenv dependency
try {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '.env')
  ]
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8')
      envConfig.split('\n').forEach((line) => {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const value = parts
            .slice(1)
            .join('=')
            .trim()
            .replace(/^['"]|['"]$/g, '')
          if (key && value && !process.env[key]) {
            process.env[key] = value
          }
        }
      })
      break
    }
  }
} catch (e) {
  console.warn('Could not auto-load .env file:', e)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/b2b_law',
  max: 20,
  min: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: true } : false
})

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err)
})

import * as drizzleSchema from './schema'

export const db = drizzle(pool, { schema: drizzleSchema })

async function reconcileLegacy0004(migrationsFolder: string): Promise<void> {
  const artifact = await query(`SELECT
    to_regclass('public.notifications') IS NOT NULL AND
    to_regclass('public.permission_audit_logs') IS NOT NULL AND
    to_regclass('public.time_logs') IS NOT NULL AND
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema='public' AND (table_name,column_name) IN (
      ('clients','direct_notes'),('companies','is_deleted'),('companies','deleted_at'),('companies','deleted_by'),
      ('users','google_user_id'),('users','two_factor_secret'),('users','two_factor_enabled'),
      ('finances','legal_engagement_id'),('finances','paid_amount'),('finances','remaining_amount'),('finances','payment_method'),('finances','status'),
      ('subscriptions','suspended_at'),('subscriptions','suspend_reason'))) = 14 AND
    (SELECT COUNT(*)::int FROM pg_constraint WHERE conname IN (
      'notifications_user_id_users_id_fk','permission_audit_logs_actor_user_id_users_id_fk',
      'permission_audit_logs_target_user_id_users_id_fk','time_logs_user_id_users_id_fk',
      'time_logs_case_id_cases_id_fk','time_logs_task_id_tasks_v2_id_fk')) = 6 AS complete`)
  if (artifact.rows[0]?.complete !== true) return
  const createdAt = 1783464841175
  const sqlPath = path.join(migrationsFolder, '0004_light_medusa.sql')
  const hash = createHash('sha256').update(fs.readFileSync(sqlPath)).digest('hex')
  await query(`INSERT INTO "drizzle"."__drizzle_migrations"(hash,created_at)
    SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE created_at=$2)`, [hash, createdAt])
  console.log('[DB] Reconciled complete legacy schema with migration 0004 tracking')
}

export async function runMigrations(): Promise<void> {
  console.log('[DB] Running Drizzle migrations...')

  // Pre-seed Drizzle migration tracking table for 0000_dear_domino
  try {
    await query('CREATE SCHEMA IF NOT EXISTS "drizzle"')
    await query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `)
    // Only legacy databases created before Drizzle tracking may skip the
    // baseline. A genuinely empty database must execute 0000 in full.
    const check = await query('SELECT id FROM "drizzle"."__drizzle_migrations" WHERE id = 1')
    const legacySchema = await query(`SELECT to_regclass('public.companies') IS NOT NULL AS present`)
    if (check.rows.length === 0 && legacySchema.rows[0]?.present === true) {
      await query(`
        INSERT INTO "drizzle"."__drizzle_migrations" (id, hash, created_at)
        VALUES (1, '741d7b0b95cace6bb95e285a97c2c05c5b24329deccf0050947710d116922bee', 1781016214198)
      `)
      console.log('[DB] Reconciled legacy database with 0000_dear_domino tracking')
    }
    await query(`SELECT setval(pg_get_serial_sequence('drizzle.__drizzle_migrations','id'), GREATEST(COALESCE((SELECT MAX(id) FROM "drizzle"."__drizzle_migrations"),1),1), true)`)
  } catch (err: any) {
    console.warn('[DB] Pre-seeding drizzle migration table failed:', err.message)
  }

  const migrationsFolder = path.join(__dirname, 'migrations')
  if (fs.existsSync(migrationsFolder)) {
    await reconcileLegacy0004(migrationsFolder)
    await migrate(db, { migrationsFolder })
    console.log('[DB] Migrations applied successfully')
  } else {
    console.warn('[DB] Migrations folder not found:', migrationsFolder)
  }
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${text.substring(0, 100)}`)
  }
  return res
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect()
}

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
}
