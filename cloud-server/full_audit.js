/**
 * full_audit.js — compares live PostgreSQL schema against expected schema definitions
 * and produces a report at audit_report.json
 *
 * Usage:  node full_audit.js
 * Requires: DATABASE_URL in .env or process.env
 */

const { Pool } = require('pg')
const path = require('path')
const fs = require('fs')

// ── 1. load env ──────────────────────────────────────────────
function loadEnv() {
  const possiblePaths = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', '.env'),
  ]
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach((line) => {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
          if (key && value && !process.env[key]) {
            process.env[key] = value
          }
        }
      })
      console.log(`[AUDIT] Loaded .env from ${envPath}`)
      return
    }
  }
  console.warn('[AUDIT] No .env file found — relying on process.env.DATABASE_URL')
}

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[AUDIT] FATAL: DATABASE_URL is not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
})

// ── Helpers ──────────────────────────────────────────────────
async function query(text, params) {
  try {
    const start = Date.now()
    const res = await pool.query(text, params)
    const dur = Date.now() - start
    if (dur > 2000) console.warn(`[SLOW ${dur}ms] ${text.substring(0, 80)}`)
    return res
  } catch (e) {
    return { rows: [], error: e.message }
  }
}

// ── 2. Gather actual schema from live database ───────────────
async function getActualTables() {
  const sql = `
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  const res = await query(sql)
  return res.rows
}

async function getActualColumns(table) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `
  const res = await query(sql, [table])
  return res.rows
}

async function getActualIndexes(table) {
  const sql = `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    ORDER BY indexname
  `
  const res = await query(sql, [table])
  return res.rows
}

async function getActualForeignKeys(table) {
  const sql = `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1
  `
  const res = await query(sql, [table])
  return res.rows
}

// ── 3. Parse expected schema from schema.sql ─────────────────
function parseExpectedTables() {
  const schemaPath = path.join(__dirname, 'src', 'db', 'schema.sql')
  if (!fs.existsSync(schemaPath)) {
    console.warn('[AUDIT] schema.sql not found at', schemaPath)
    return {}
  }

  const content = fs.readFileSync(schemaPath, 'utf8')
  const expected = {}

  // Match CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(/gi
  let match
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1]
    if (!expected[tableName]) {
      expected[tableName] = { name: tableName, columns: [], indexes: [] }
    }
  }

  // Match column definitions (simplified)
  const lines = content.split('\n')
  let currentTable = null
  for (const line of lines) {
    const tableMatch = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/i)
    if (tableMatch) {
      currentTable = tableMatch[1]
      continue
    }
    if (currentTable && line.includes(');') && !line.includes('--')) {
      currentTable = null
      continue
    }
    if (currentTable) {
      const colMatch = line.match(/^\s+(\w+)\s+(TEXT|UUID|BOOLEAN|INTEGER|TIMESTAMPTZ|NUMERIC|SERIAL|BIGINT|JSONB|DATE|TIME|FLOAT|DOUBLE|REAL|SMALLINT)/i)
      if (colMatch && !line.trim().startsWith('--') && !line.trim().startsWith('CONSTRAINT') && !line.trim().startsWith('INDEX') && !line.trim().startsWith('UNIQUE') && !line.trim().startsWith('PRIMARY') && !line.trim().startsWith('FOREIGN') && !line.trim().startsWith('CHECK')) {
        expected[currentTable].columns.push(colMatch[1])
      }
    }
  }

  // Match CREATE INDEX statements
  const idxRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(?:public\.)?(\w+)/gi
  while ((match = idxRegex.exec(content)) !== null) {
    const tableName = match[2]
    if (expected[tableName]) {
      expected[tableName].indexes.push(match[1])
    }
  }

  // Drizzle migration files
  const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations')
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && !f.startsWith('meta'))
    for (const file of files.sort()) {
      const migContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      const migTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|"public"\.)?"?(\w+)"?\s*\(/gi
      while ((migMatch = migTableRegex.exec(migContent)) !== null) {
        const tn = migMatch[1]
        if (!expected[tn]) {
          expected[tn] = { name: tn, columns: [], indexes: [], source: file }
        }
      }
    }
  }

  return expected
}

// ── 4. Main audit logic ──────────────────────────────────────
async function runAudit() {
  console.log('='.repeat(60))
  console.log('[AUDIT] Starting full database schema audit')
  console.log('='.repeat(60))

  const expectedTables = parseExpectedTables()
  const actualTables = await getActualTables()
  const actualTableNames = new Set(actualTables.map(t => t.table_name))

  const report = {
    timestamp: new Date().toISOString(),
    database_url_sanitized: DATABASE_URL.replace(/\/\/.*@/, '//***@'),
    summary: { total_expected: 0, total_actual: 0, missing: 0, extra: 0, issues: 0 },
    expected_tables: Object.keys(expectedTables).length,
    actual_tables: actualTables.length,
    missing_tables: [],
    extra_tables: [],
    table_details: [],
  }

  // Check missing tables
  for (const [name, def] of Object.entries(expectedTables)) {
    if (!actualTableNames.has(name)) {
      report.missing_tables.push(name)
    }
  }

  // Check extra tables
  for (const t of actualTables) {
    if (!expectedTables[t.table_name]) {
      report.extra_tables.push(t.table_name)
    }
  }

  report.summary.missing = report.missing_tables.length
  report.summary.extra = report.extra_tables.length

  // Detailed column/index check for tables that exist
  for (const [name, def] of Object.entries(expectedTables)) {
    if (!actualTableNames.has(name)) continue

    const actualCols = await getActualColumns(name)
    const actualIdxs = await getActualIndexes(name)
    const actualFks = await getActualForeignKeys(name)

    const actualColNames = new Set(actualCols.map(c => c.column_name))
    const expectedColNames = new Set(def.columns)
    const missingCols = def.columns.filter(c => !actualColNames.has(c))
    const extraCols = actualCols.filter(c => !expectedColNames.has(c.column_name) && !['id', 'created_at', 'updated_at'].includes(c.column_name)).map(c => c.column_name)

    const detail = {
      table: name,
      expected_columns: def.columns.length,
      actual_columns: actualCols.length,
      missing_columns: missingCols,
      extra_columns: extraCols,
      indexes: { expected: def.indexes.length, actual: actualIdxs.length, actual_list: actualIdxs.map(i => i.indexname) },
      foreign_keys: actualFks.length,
      has_issues: missingCols.length > 0,
    }
    report.table_details.push(detail)
    if (missingCols.length > 0) {
      report.summary.issues++
    }
  }

  report.summary.total_expected = Object.keys(expectedTables).length
  report.summary.total_actual = actualTables.length

  console.log(`\n[AUDIT] Expected tables: ${report.summary.total_expected}`)
  console.log(`[AUDIT] Actual tables:    ${report.summary.total_actual}`)
  console.log(`[AUDIT] Missing tables:   ${report.summary.missing}`)
  console.log(`[AUDIT] Extra tables:     ${report.summary.extra}`)
  console.log(`[AUDIT] Tables with column issues: ${report.summary.issues}`)

  if (report.missing_tables.length > 0) {
    console.log(`\n[AUDIT] ⚠ MISSING TABLES:`)
    report.missing_tables.forEach(t => console.log(`         - ${t}`))
  }

  if (report.extra_tables.length > 0) {
    console.log(`\n[AUDIT] ℹ EXTRA TABLES (not in schema.sql):`)
    report.extra_tables.forEach(t => console.log(`         - ${t}`))
  }

  // Write report
  const reportPath = path.join(__dirname, 'audit_report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\n[AUDIT] Report saved to ${reportPath}`)

  await pool.end()
  console.log('[AUDIT] Done.')
}

runAudit().catch(e => {
  console.error('[AUDIT] Fatal error:', e)
  pool.end().catch(() => {})
  process.exit(1)
})
