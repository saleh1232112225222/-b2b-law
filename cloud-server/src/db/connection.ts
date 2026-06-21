import { Pool, PoolClient, QueryResult } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as fs from 'fs'
import * as path from 'path'

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
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
})

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err)
})

import * as drizzleSchema from './schema'

export const db = drizzle(pool, { schema: drizzleSchema })

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
    // Check if 0000_dear_domino is already there
    const check = await query('SELECT id FROM "drizzle"."__drizzle_migrations" WHERE id = 1')
    if (check.rows.length === 0) {
      await query(`
        INSERT INTO "drizzle"."__drizzle_migrations" (id, hash, created_at)
        VALUES (1, '741d7b0b95cace6bb95e285a97c2c05c5b24329deccf0050947710d116922bee', 1781016214198)
      `)
      console.log('[DB] Pre-seeded drizzle migration table with 0000_dear_domino')
    }
  } catch (err: any) {
    console.warn('[DB] Pre-seeding drizzle migration table failed:', err.message)
  }

  const migrationsFolder = path.join(__dirname, 'migrations')
  if (fs.existsSync(migrationsFolder)) {
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
