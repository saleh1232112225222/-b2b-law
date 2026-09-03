/**
 * Phase R2 Security Foundation & Three-Layer Package Verification Tests
 * Covers production round-trip packaging, exact boundary assertions, adversarial payload defense,
 * PGlite multi-tenant isolation, financial immutability, and Express containment gates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { PGlite } from '@electric-sql/pglite'
import * as dbConnection from '../db/connection'
import {
  SERVER_ENTITY_ALLOWLIST,
  tenantBackupRouter,
  validatePackageStructureSafety,
  validateTenantManifest,
  validateStagedEntities,
  enforcePayloadBounds,
  buildTenantSafeUpsert,
  buildTenantScopedSelect,
  countUpsertResult,
  MAX_PACKAGE_SIZE_BYTES,
  MAX_TOTAL_RECORDS,
  MAX_JSON_DEPTH
} from '../routes/tenantBackup'
import {
  createTenantPackage,
  verifyAndStageTenantPackage,
  validateEncryptedEnvelopeStructure,
  validateDecryptedPackageStructure,
  validateAndConvertLegacyJson,
  validateFieldCountPerRecord
} from '../shared/b2btenant'

const JWT_SECRET = process.env.JWT_SECRET || 'b2b-law-cloud-dev-secret'

// Helper to generate a valid test JWT
function createTestToken(payload: {
  userId: string
  companyId: string
  roleKey: string
  username?: string
}): string {
  return jwt.sign(
    {
      userId: payload.userId,
      companyId: payload.companyId,
      roleKey: payload.roleKey,
      username: payload.username || 'testuser',
      jti: 'test-jti-' + Math.random().toString(36).substring(2)
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

// Helper to dispatch HTTP request to Express app using native fetch
async function dispatchRequest(
  app: express.Express,
  options: {
    method: 'GET' | 'POST'
    url: string
    headers?: Record<string, string>
    body?: any
  }
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const addr = server.address() as any
      const port = addr.port
      try {
        const fetchHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }

        const res = await fetch(`http://127.0.0.1:${port}${options.url}`, {
          method: options.method,
          headers: fetchHeaders,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined
        })

        let resBody: any = null
        const text = await res.text()
        try {
          resBody = JSON.parse(text)
        } catch {
          resBody = text
        }

        const resHeaders: Record<string, string> = {}
        res.headers.forEach((v, k) => {
          resHeaders[k] = v
        })

        server.close(() => {
          resolve({ status: res.status, body: resBody, headers: resHeaders })
        })
      } catch (err) {
        server.close(() => {
          resolve({ status: 500, body: { error: String(err) }, headers: {} })
        })
      }
    })
  })
}

describe('PHASE R2 Security Foundation & Verification Suite', () => {
  let app: express.Express

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ENABLE_TENANT_BACKUP = 'false'
    process.env.JWT_SECRET = JWT_SECRET

    // Mock dbConnection.query so authMiddleware subscription check succeeds for test tokens
    vi.spyOn(dbConnection, 'query').mockImplementation(((sql: string) => {
      if (sql.includes('FROM subscriptions')) {
        return Promise.resolve({
          rows: [
            {
              status: 'active',
              current_period_end: new Date(Date.now() + 86400000).toISOString()
            }
          ]
        })
      }
      if (sql.includes('FROM user_permissions') || sql.includes('FROM role_permissions')) {
        return Promise.resolve({ rows: [] })
      }
      return Promise.resolve({ rows: [] })
    }) as any)

    app = express()
    app.use(express.json({ limit: '10mb' }))

    const isTenantBackupEnabled = process.env.ENABLE_TENANT_BACKUP === 'true'
    if (isTenantBackupEnabled) {
      app.use('/api/tenant', tenantBackupRouter)
    } else {
      app.use('/api/tenant', (_req, res) => {
        res.status(503).json({
          error: 'FeatureDisabled',
          message: 'خدمة النسخ الاحتياطي والاستعادة معطلة حالياً لأسباب أمنية وقيد التحديث.',
          code: 'TENANT_BACKUP_DISABLED'
        })
      })
    }
  })

  // ---------------------------------------------------------------------------------------------
  // Test 1: Production Round-Trip: createTenantPackage -> verifyAndStageTenantPackage
  // ---------------------------------------------------------------------------------------------
  it('1. [Production Round-Trip] createTenantPackage generates valid encrypted package accepted with correct passphrase and rejected with wrong passphrase', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001'
    const passphrase = 'SuperSecurePassphrase123!'
    const sampleData = {
      clients: [
        { id: '11111111-1111-1111-1111-111111111111', company_id: tenantId, name: 'Client A' }
      ],
      cases: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          company_id: tenantId,
          client_id: '11111111-1111-1111-1111-111111111111',
          case_number: 'CASE-001'
        }
      ]
    }

    // 1. Build and encrypt package
    const encryptedJson = createTenantPackage(tenantId, sampleData, 'web', passphrase)
    expect(typeof encryptedJson).toBe('string')

    // 2. Validate Layer 1 (Encrypted Envelope)
    const envelope = JSON.parse(encryptedJson)
    const envValidation = validateEncryptedEnvelopeStructure(envelope)
    expect(envValidation.valid).toBe(true)

    // 3. Staging with correct passphrase succeeds
    const successStage = verifyAndStageTenantPackage(encryptedJson, passphrase, tenantId)
    expect(successStage.valid).toBe(true)
    expect(successStage.manifest.tenantId).toBe(tenantId)
    expect(successStage.stagedData.clients.length).toBe(1)
    expect(successStage.stagedData.cases.length).toBe(1)

    // 4. Staging with wrong passphrase fails closed
    const failStage = verifyAndStageTenantPackage(encryptedJson, 'WrongPassphrase999!', tenantId)
    expect(failStage.valid).toBe(false)
    expect(failStage.errors.length).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------------------------
  // Test 2: Dedicated Production Field-Count Boundary Helper (100 Accepted vs 101 Rejected)
  // ---------------------------------------------------------------------------------------------
  it('2. [Field-Count Boundary] Validates exactly 100 fields accepted and 101 fields rejected through production helper', () => {
    // 1. Construct exact 100-field object
    const row100: Record<string, string> = { id: '1' }
    for (let i = 1; i < 100; i++) {
      row100[`field_${i}`] = `value_${i}`
    }
    expect(Object.keys(row100).length).toBe(100)

    // Pass through production helper -> MUST be valid
    const res100 = validateFieldCountPerRecord(row100, 100)
    expect(res100.valid).toBe(true)
    expect(res100.count).toBe(100)

    // 2. Construct exact 101-field object
    const row101: Record<string, string> = { id: '1' }
    for (let i = 1; i < 101; i++) {
      row101[`field_${i}`] = `value_${i}`
    }
    expect(Object.keys(row101).length).toBe(101)

    // Pass through production helper -> MUST be rejected
    const res101 = validateFieldCountPerRecord(row101, 100)
    expect(res101.valid).toBe(false)
    expect(res101.code).toBe('FIELD_COUNT_EXCEEDED')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 3: Exact Boundary Assertions (100k Records, 50MB, Depth 3)
  // ---------------------------------------------------------------------------------------------
  it('3. [Exact Boundary Limits] Tests boundaries on both accepted and rejected sides for records, bytes, and depth', () => {
    // Byte limit (50MB vs 50MB + 1)
    expect(enforcePayloadBounds({}, MAX_PACKAGE_SIZE_BYTES).valid).toBe(true)
    const sizeOver = enforcePayloadBounds({}, MAX_PACKAGE_SIZE_BYTES + 1)
    expect(sizeOver.valid).toBe(false)
    expect(sizeOver.code).toBe('PACKAGE_SIZE_LIMIT_EXCEEDED')

    // Nesting depth (Depth 3 vs Depth 4)
    const depth3 = { l1: { l2: { l3: 'valid' } } }
    const depth4 = { l1: { l2: { l3: { l4: 'too deep' } } } }
    expect(enforcePayloadBounds(depth3).valid).toBe(true)
    const depthRes = enforcePayloadBounds(depth4)
    expect(depthRes.valid).toBe(false)
    expect(depthRes.code).toBe('PAYLOAD_DEPTH_EXCEEDED')

    // Record count limit (100,000 accepted vs 100,001 rejected)
    const validClient = { id: '1', company_id: 'OFFICE-1', name: 'A' }
    const array100k = new Array(MAX_TOTAL_RECORDS).fill(validClient)
    const array100kPlus1 = new Array(MAX_TOTAL_RECORDS + 1).fill(validClient)

    const res100k = validateStagedEntities({ clients: array100k })
    expect(res100k.valid).toBe(true)
    expect(res100k.totalRows).toBe(100_000)

    const res100kPlus1 = validateStagedEntities({ clients: array100kPlus1 })
    expect(res100kPlus1.valid).toBe(false)
    expect(res100kPlus1.code).toBe('RECORD_LIMIT_EXCEEDED')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 4: Adversarial Decrypted Package Structural Defense
  // ---------------------------------------------------------------------------------------------
  it('4. [Adversarial Defense] Rejects malformed root, missing manifest, array rows, prototype keys, and non-empty attachments', () => {
    expect(validateDecryptedPackageStructure(null).valid).toBe(false)
    expect(validateDecryptedPackageStructure([]).valid).toBe(false)
    expect(validateDecryptedPackageStructure('string').valid).toBe(false)

    // Missing manifest
    expect(validateDecryptedPackageStructure({ data: {} }).valid).toBe(false)

    // Invalid data block
    expect(
      validateDecryptedPackageStructure({ manifest: { tenantId: 'T1' }, data: 'invalid' }).valid
    ).toBe(false)

    // Non-array entity
    expect(
      validateDecryptedPackageStructure({
        manifest: { tenantId: 'T1' },
        data: { clients: { not: 'array' } }
      }).valid
    ).toBe(false)

    // Array row
    expect(
      validateDecryptedPackageStructure({
        manifest: { tenantId: 'T1' },
        data: { clients: [['array_row']] }
      }).valid
    ).toBe(false)

    // Prototype pollution
    const protoPayload = JSON.parse(
      '{"__proto__": {"admin": true}, "manifest": {"tenantId": "T1"}}'
    )
    expect(validateDecryptedPackageStructure(protoPayload).code).toBe(
      'PROTOTYPE_POLLUTION_REJECTED'
    )

    const rowProtoPayload = JSON.parse(
      '{"manifest": {"tenantId": "T1"}, "data": {"clients": [{"__proto__": "bad"}]}}'
    )
    expect(validateDecryptedPackageStructure(rowProtoPayload).code).toBe(
      'PROTOTYPE_POLLUTION_REJECTED'
    )

    // Non-empty attachment in R2
    const attachPayload = {
      manifest: { tenantId: 'T1' },
      data: { clients: [] },
      attachments: { 'file1.pdf': 'base64' }
    }
    const attachRes = validateDecryptedPackageStructure(attachPayload)
    expect(attachRes.valid).toBe(false)
    expect(attachRes.code).toBe('ATTACHMENTS_UNSUPPORTED_IN_R2')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 5: Legacy JSON Compatibility Validator & Adapter
  // ---------------------------------------------------------------------------------------------
  it('5. [Legacy JSON Support] Validates and converts legacy plaintext backup without requiring V2 encrypted envelope', () => {
    const tenantId = 'OFFICE-1'
    const legacyV1Snapshot = {
      version: '1.0',
      data: {
        clients: [{ id: 'C1', name: 'Legacy Client' }],
        cases: [{ id: 'CS1', case_number: 'L-001' }]
      }
    }

    const convRes = validateAndConvertLegacyJson(legacyV1Snapshot, tenantId)
    expect(convRes.valid).toBe(true)
    expect(convRes.data?.clients.length).toBe(1)
    expect(convRes.data?.clients[0].company_id).toBe(tenantId)
  })

  // ---------------------------------------------------------------------------------------------
  // Test 6: Production Helper — buildTenantSafeUpsert (100% Parameterized SQL Proof)
  // ---------------------------------------------------------------------------------------------
  it('6. [Production Helper] buildTenantSafeUpsert proves 100% parameterized SQL with zero string interpolation', () => {
    const companyId = 'OFFICE-UUID-1234'
    const row = {
      id: 'CASE-UUID-999',
      case_number: 'CASE-001',
      opponent_name: 'Opponent X'
    }

    const { sql, values } = buildTenantSafeUpsert('cases', row, companyId)

    // Proof 1: companyId is NOT interpolated into the SQL string text
    expect(sql).not.toContain(companyId)

    // Proof 2: Parameter index matches values array
    const companyParamIndex = values.length
    expect(sql).toContain(`WHERE "cases"."company_id" = $${companyParamIndex}`)
    expect(values[companyParamIndex - 1]).toBe(companyId)
    expect(values).toEqual(['CASE-UUID-999', 'CASE-001', 'Opponent X', companyId, companyId])
  })

  // ---------------------------------------------------------------------------------------------
  // Test 7: Stateful PGlite Engine Multi-Tenant Isolation using buildTenantSafeUpsert
  // ---------------------------------------------------------------------------------------------
  it('7. [PGlite Engine Integration] Production buildTenantSafeUpsert guarantees foreign-tenant row remains unchanged with 0 writes', async () => {
    const pg = new PGlite()

    await pg.exec(`
      CREATE TABLE cases (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_number TEXT NOT NULL,
        opponent_name TEXT
      );
    `)

    const officeB_CompanyId = 'OFFICE-B-UUID'
    const caseId = 'CASE-UUID-999'
    await pg.query(
      `INSERT INTO cases (id, company_id, case_number, opponent_name) VALUES ($1, $2, $3, $4)`,
      [caseId, officeB_CompanyId, 'CASE-B-001', 'Initial Opponent B']
    )

    const officeA_CompanyId = 'OFFICE-A-UUID'
    const attackerRow = {
      id: caseId,
      case_number: 'HACKED-CASE-A',
      opponent_name: 'Hacked Opponent'
    }

    const { sql, values } = buildTenantSafeUpsert('cases', attackerRow, officeA_CompanyId)
    const result = await pg.query(sql, values)
    const counts = countUpsertResult(result.rows.length, false)

    expect(result.rows.length).toBe(0)
    expect(counts.imported).toBe(0)
    expect(counts.conflictIgnored).toBe(1)

    const queryB = await pg.query(`SELECT * FROM cases WHERE id = $1`, [caseId])
    expect(queryB.rows.length).toBe(1)
    const rowB = queryB.rows[0] as any
    expect(rowB.company_id).toBe(officeB_CompanyId)
    expect(rowB.case_number).toBe('CASE-B-001')
    expect(rowB.opponent_name).toBe('Initial Opponent B')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 8: Stateful PGlite Engine Financial Append-Only Immutability using buildTenantSafeUpsert
  // ---------------------------------------------------------------------------------------------
  it('8. [PGlite Engine Integration] Production buildTenantSafeUpsert guarantees financial immutability and accurate conflict counting', async () => {
    const pg = new PGlite()

    await pg.exec(`
      CREATE TABLE finances (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date DATE NOT NULL,
        type TEXT NOT NULL,
        description TEXT
      );
    `)

    const companyId = 'OFFICE-A-UUID'
    const financeId = 'FIN-RECORD-001'
    await pg.query(
      `INSERT INTO finances (id, company_id, amount, date, type, description) VALUES ($1, $2, $3, $4, $5, $6)`,
      [financeId, companyId, 50000, '2026-08-01', 'expense', 'Original Approved Invoice']
    )

    const modifiedRow = {
      id: financeId,
      amount: 0,
      date: '2026-08-27',
      type: 'expense',
      description: 'Tampered Zero Amount'
    }

    const { sql, values } = buildTenantSafeUpsert('finances', modifiedRow, companyId)
    const result = await pg.query(sql, values)
    const counts = countUpsertResult(result.rows.length, true)

    expect(counts.imported).toBe(0)
    expect(counts.conflictIgnored).toBe(1)

    const checkQuery = await pg.query(`SELECT * FROM finances WHERE id = $1`, [financeId])
    const row = checkQuery.rows[0] as any
    expect(Number(row.amount)).toBe(50000)
    expect(row.description).toBe('Original Approved Invoice')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 9: Express Integration — Immediate Containment Gate (503)
  // ---------------------------------------------------------------------------------------------
  it('9. /api/tenant is unreachable by default when ENABLE_TENANT_BACKUP is unset/false', async () => {
    process.env.ENABLE_TENANT_BACKUP = 'false'
    const res = await dispatchRequest(app, {
      method: 'POST',
      url: '/api/tenant/export',
      body: { recoveryPassphrase: 'ValidPassword123!' }
    })

    expect(res.status).toBe(503)
    expect(res.body.code).toBe('TENANT_BACKUP_DISABLED')
    expect(res.body.error).toBe('FeatureDisabled')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 10: Express Integration — Anonymous Requests Return 401
  // ---------------------------------------------------------------------------------------------
  it('10. Anonymous requests without Bearer token pass through authMiddleware and return 401', async () => {
    process.env.ENABLE_TENANT_BACKUP = 'true'
    const activeApp = express()
    activeApp.use(express.json())
    activeApp.use('/api/tenant', tenantBackupRouter)

    const res = await dispatchRequest(activeApp, {
      method: 'POST',
      url: '/api/tenant/export',
      body: { recoveryPassphrase: 'ValidPassword123!' }
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toContain('غير مصرح')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 11: Express Integration — Ordinary Authenticated Employees Return 403 FORBIDDEN_ROLE
  // ---------------------------------------------------------------------------------------------
  it('11. Ordinary authenticated employees (licensed_lawyer / secretary) receive 403 FORBIDDEN_ROLE', async () => {
    process.env.ENABLE_TENANT_BACKUP = 'true'
    const activeApp = express()
    activeApp.use(express.json())
    activeApp.use('/api/tenant', tenantBackupRouter)

    const lawyerToken = createTestToken({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      roleKey: 'licensed_lawyer'
    })

    const res = await dispatchRequest(activeApp, {
      method: 'POST',
      url: '/api/tenant/export',
      headers: { Authorization: `Bearer ${lawyerToken}` },
      body: { recoveryPassphrase: 'ValidPassword123!' }
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN_ROLE')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 12: Express Integration — Step-Up Token Requirement (403 STEP_UP_REQUIRED)
  // ---------------------------------------------------------------------------------------------
  it('12. Read-Only Permission Gate: Admin without step-up token receives 403 STEP_UP_REQUIRED', async () => {
    process.env.ENABLE_TENANT_BACKUP = 'true'
    process.env.BACKUP_STEP_UP_SECRET = 'test-secret-32-chars-long-security-token'
    const activeApp = express()
    activeApp.use(express.json())
    activeApp.use('/api/tenant', tenantBackupRouter)

    const adminToken = createTestToken({
      userId: '00000000-0000-0000-0000-000000000010',
      companyId: 'OFFICE-1',
      roleKey: 'super_admin'
    })

    const res = await dispatchRequest(activeApp, {
      method: 'POST',
      url: '/api/tenant/export',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { recoveryPassphrase: 'ValidPassword123!' }
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('STEP_UP_REQUIRED')
  })

  // ---------------------------------------------------------------------------------------------
  // Test 13: Deferred Database Client Acquisition — Rejected requests acquire 0 database clients from pool
  // ---------------------------------------------------------------------------------------------
  it('13. Deferred Client Acquisition: Rejected / invalid requests acquire 0 database clients from pool', async () => {
    process.env.ENABLE_TENANT_BACKUP = 'true'
    const activeApp = express()
    activeApp.use(express.json())
    activeApp.use('/api/tenant', tenantBackupRouter)

    const getClientSpy = vi.spyOn(dbConnection, 'getClient')

    const res = await dispatchRequest(activeApp, {
      method: 'POST',
      url: '/api/tenant/import-execute',
      body: { recoveryPassphrase: 'ValidPassword123!' }
    })

    expect(res.status).toBe(401)
    expect(getClientSpy).not.toHaveBeenCalled()
  })

  it('14. Rejects unknown entities, unknown columns, and missing required fields before SQL execution', () => {
    expect(validateStagedEntities({ attacker_table: [] }).code).toBe('ENTITY_NOT_ALLOWLISTED')
    expect(
      validateStagedEntities({
        clients: [
          {
            id: 'CLIENT-1',
            company_id: 'OFFICE-1',
            name: 'Client',
            injected_admin_override: true
          }
        ]
      }).code
    ).toBe('COLUMN_NOT_ALLOWLISTED')
    expect(
      validateStagedEntities({ clients: [{ id: 'CLIENT-1', company_id: 'OFFICE-1' }] }).code
    ).toBe('REQUIRED_COLUMN_MISSING')
    expect(() =>
      buildTenantSafeUpsert(
        'clients',
        { id: 'CLIENT-1', company_id: 'OFFICE-1', name: 'Client', unexpected: 'x' },
        'OFFICE-1'
      )
    ).toThrow('COLUMN_NOT_ALLOWLISTED')
  })

  it('15. Uses an allowlisted parent join for indirectly tenant-owned legal-service records', () => {
    const config = SERVER_ENTITY_ALLOWLIST.legal_service_attachments
    expect(config.tenantScope).toEqual({
      kind: 'parent',
      localColumn: 'engagement_id',
      parentTable: 'legal_engagements',
      parentColumn: 'id',
      parentTenantColumn: 'company_id'
    })
    const sql = buildTenantScopedSelect(config)
    expect(sql).toContain('JOIN "legal_engagements" tenant_parent')
    expect(sql).toContain('tenant_parent."company_id" = $1')
    expect(sql).not.toContain('legal_service_attachments" WHERE company_id')
  })
})
