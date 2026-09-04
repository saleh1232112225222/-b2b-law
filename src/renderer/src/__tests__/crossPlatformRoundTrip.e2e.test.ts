import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'
import { PGlite } from '@electric-sql/pglite'
import {
  createTenantPackage,
  verifyAndStageTenantPackage,
  hashEntityRecords
} from '../../../../src/shared/b2btenant'

describe('E2E Cross-Platform Round-Trip: PostgreSQL (Web) <-> SQLite (Desktop)', () => {
  let pglite: PGlite
  let DatabaseSyncClass: any = null
  let sqliteDb: any

  const testTenantId = 'e2e-tenant-' + crypto.randomUUID()
  const testPassphrase = 'ValidPassphrase123!Secure@2026'

  beforeAll(async () => {
    // 1. Initialize PGlite (Web PostgreSQL)
    pglite = new PGlite()
    await pglite.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trial_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        case_number TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        session_date TEXT NOT NULL,
        court TEXT,
        decision TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS finances (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    // 2. Initialize SQLite (Desktop)
    try {
      const sqliteMod = await (new Function('m', 'return import(m)'))('node:sqlite')
      DatabaseSyncClass = sqliteMod?.DatabaseSync || null
    } catch {}

    if (DatabaseSyncClass) {
      sqliteDb = new DatabaseSyncClass(':memory:')
      // Desktop SQLite schema (Single-tenant: NO company_id column)
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          title TEXT NOT NULL,
          case_number TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          session_date TEXT NOT NULL,
          court TEXT,
          decision TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS finances (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          notes TEXT,
          created_at TEXT
        );
      `)
    }
  })

  it('1. populates initial test office in PostgreSQL with rich Arabic records', async () => {
    await pglite.query(`INSERT INTO companies (id, name) VALUES ($1, $2);`, [
      testTenantId,
      'شركة العدالة الدولية للمحاماة والاستشارات'
    ])

    await pglite.query(
      `INSERT INTO clients (id, company_id, name, phone) VALUES ($1, $2, $3, $4);`,
      ['client-1', testTenantId, 'الشيخ محمد بن صالح القحطاني', '0501234567']
    )

    await pglite.query(
      `INSERT INTO cases (id, company_id, client_id, title, case_number) VALUES ($1, $2, $3, $4, $5);`,
      ['case-1', testTenantId, 'client-1', 'دعوى منازعة تجارية وإلزام بالسداد', '1448/ت/892']
    )

    await pglite.query(
      `INSERT INTO sessions (id, company_id, case_id, session_date, court, decision) VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        'session-1',
        testTenantId,
        'case-1',
        '1448-03-15',
        'المحكمة التجارية بالرياض - الدائرة الخامسة',
        'تأجيل الجلسة لتبادل المذكرات الجوابية'
      ]
    )

    await pglite.query(
      `INSERT INTO finances (id, company_id, type, amount, notes) VALUES ($1, $2, $3, $4, $5);`,
      ['finance-1', testTenantId, 'income', 15000.5, 'دفعة مقدمة من أتعاب القضية التجارية']
    )

    const clientRows = await pglite.query(`SELECT * FROM clients WHERE company_id = $1`, [testTenantId])
    expect(clientRows.rows).toHaveLength(1)
    expect((clientRows.rows[0] as any).name).toBe('الشيخ محمد بن صالح القحطاني')
  })

  let encryptedPackagePayload: string

  it('2. exports PostgreSQL tenant data into an authenticated encrypted .b2btenant package', async () => {
    // Collect records for export
    const clients = (await pglite.query(`SELECT * FROM clients WHERE company_id = $1`, [testTenantId])).rows
    const cases = (await pglite.query(`SELECT * FROM cases WHERE company_id = $1`, [testTenantId])).rows
    const sessions = (await pglite.query(`SELECT * FROM sessions WHERE company_id = $1`, [testTenantId])).rows
    const finances = (await pglite.query(`SELECT * FROM finances WHERE company_id = $1`, [testTenantId])).rows

    const exportData: Record<string, any[]> = {
      clients: clients as any[],
      cases: cases as any[],
      sessions: sessions as any[],
      finances: finances as any[]
    }

    encryptedPackagePayload = createTenantPackage(
      testTenantId,
      exportData,
      'web',
      testPassphrase
    )

    expect(typeof encryptedPackagePayload).toBe('string')
    expect(encryptedPackagePayload.length).toBeGreaterThan(100)

    // Unpack and verify
    const result = verifyAndStageTenantPackage(
      encryptedPackagePayload,
      testPassphrase,
      testTenantId
    )

    if (!result.valid) {
      console.log('STAGING ERRORS:', result.errors)
    }
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expect(result.manifest.tenantId).toBe(testTenantId)
    expect(result.stagedData.clients).toHaveLength(1)
    expect(result.stagedData.clients[0].name).toBe('الشيخ محمد بن صالح القحطاني')
  })

  it('3. imports the package into Desktop SQLite schema (stripping company_id and retaining Arabic data)', async () => {
    if (!sqliteDb) return

    const result = verifyAndStageTenantPackage(
      encryptedPackagePayload,
      testPassphrase,
      testTenantId
    )

    expect(result.valid).toBe(true)

    // Simulate Desktop TenantPackageRestoreService injection:
    // Read SQLite table columns dynamically and insert only matching columns
    for (const [table, rows] of Object.entries(result.stagedData)) {
      const colInfo = sqliteDb.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]
      if (!colInfo || colInfo.length === 0) continue

      const colNames = new Set(colInfo.map((c) => c.name))

      for (const row of rows as any[]) {
        const filteredEntries = Object.entries(row).filter(([col]) => colNames.has(col))
        const cols = filteredEntries.map(([col]) => `"${col}"`).join(', ')
        const placeholders = filteredEntries.map(() => '?').join(', ')
        const values = filteredEntries.map(([, val]) => {
          if (val === null || val === undefined) return null
          if (typeof val === 'object') return JSON.stringify(val)
          if (typeof val === 'boolean') return val ? 1 : 0
          return val
        })

        sqliteDb
          .prepare(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`)
          .run(...values)
      }
    }

    // Verify SQLite contents
    const sqliteClients = sqliteDb.prepare('SELECT * FROM clients').all() as any[]
    const sqliteCases = sqliteDb.prepare('SELECT * FROM cases').all() as any[]
    const sqliteSessions = sqliteDb.prepare('SELECT * FROM sessions').all() as any[]
    const sqliteFinances = sqliteDb.prepare('SELECT * FROM finances').all() as any[]

    expect(sqliteClients).toHaveLength(1)
    expect(sqliteClients[0].id).toBe('client-1')
    expect(sqliteClients[0].name).toBe('الشيخ محمد بن صالح القحطاني')
    expect(sqliteClients[0].company_id).toBeUndefined() // Confirmed stripped for local SQLite

    expect(sqliteCases).toHaveLength(1)
    expect(sqliteCases[0].title).toBe('دعوى منازعة تجارية وإلزام بالسداد')

    expect(sqliteSessions).toHaveLength(1)
    expect(sqliteSessions[0].court).toBe('المحكمة التجارية بالرياض - الدائرة الخامسة')

    expect(sqliteFinances).toHaveLength(1)
    expect(sqliteFinances[0].amount).toBe(15000.5)
  })

  it('4. exports from Desktop SQLite and restores cleanly into a new PostgreSQL tenant', async () => {
    if (!sqliteDb) return

    // 1. Read from Desktop SQLite
    const sqliteClients = sqliteDb.prepare('SELECT * FROM clients').all() as any[]
    const sqliteCases = sqliteDb.prepare('SELECT * FROM cases').all() as any[]
    const sqliteSessions = sqliteDb.prepare('SELECT * FROM sessions').all() as any[]
    const sqliteFinances = sqliteDb.prepare('SELECT * FROM finances').all() as any[]

    const desktopExportData: Record<string, any[]> = {
      clients: sqliteClients,
      cases: sqliteCases,
      sessions: sqliteSessions,
      finances: sqliteFinances
    }

    const newTargetTenantId = 'restored-tenant-' + crypto.randomUUID()

    // 2. Create Desktop Package with target tenant ID
    const desktopPackagePayload = createTenantPackage(
      newTargetTenantId,
      desktopExportData,
      'desktop',
      testPassphrase
    )

    const result = verifyAndStageTenantPackage(
      desktopPackagePayload,
      testPassphrase,
      newTargetTenantId
    )
    expect(result.valid).toBe(true)

    // 3. Restore into PostgreSQL: Attach tenantId as company_id
    await pglite.query(`INSERT INTO companies (id, name) VALUES ($1, $2);`, [
      newTargetTenantId,
      'المكتب المستعاد على السحاب'
    ])

    for (const [table, rows] of Object.entries(result.stagedData)) {
      for (const row of rows as any[]) {
        const enrichedRow = { ...row, company_id: newTargetTenantId }
        const cols = Object.keys(enrichedRow).join(', ')
        const placeholders = Object.keys(enrichedRow).map((_, idx) => `$${idx + 1}`).join(', ')
        const values = Object.values(enrichedRow)

        await pglite.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values)
      }
    }

    // 4. Verify in PostgreSQL
    const restoredClients = await pglite.query(`SELECT * FROM clients WHERE company_id = $1`, [newTargetTenantId])
    const restoredCases = await pglite.query(`SELECT * FROM cases WHERE company_id = $1`, [newTargetTenantId])
    const restoredSessions = await pglite.query(`SELECT * FROM sessions WHERE company_id = $1`, [newTargetTenantId])
    const restoredFinances = await pglite.query(`SELECT * FROM finances WHERE company_id = $1`, [newTargetTenantId])

    expect(restoredClients.rows).toHaveLength(1)
    expect((restoredClients.rows[0] as any).name).toBe('الشيخ محمد بن صالح القحطاني')
    expect((restoredClients.rows[0] as any).company_id).toBe(newTargetTenantId)

    expect(restoredCases.rows).toHaveLength(1)
    expect((restoredCases.rows[0] as any).title).toBe('دعوى منازعة تجارية وإلزام بالسداد')

    expect(restoredSessions.rows).toHaveLength(1)
    expect((restoredSessions.rows[0] as any).decision).toBe('تأجيل الجلسة لتبادل المذكرات الجوابية')

    expect(restoredFinances.rows).toHaveLength(1)
    expect(Number((restoredFinances.rows[0] as any).amount)).toBe(15000.5)
  })
})
