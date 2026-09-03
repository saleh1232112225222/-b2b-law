import { describe, it, expect } from 'vitest'
import {
  createTenantPackage,
  verifyAndStageTenantPackage,
  convertLegacyV1JsonToCanonical
} from '../../../shared/b2btenant'

describe('Portable .b2btenant Package & Envelope Encryption (Phase 3)', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const passphrase = 'MySuperSecurePassphrase2026!'

  const mockData: Record<string, any[]> = {
    companies: [{ id: tenantId, name: 'مكتب المحاماة التجريبي' }],
    clients: [
      { id: 'cli-1', company_id: tenantId, name: 'عبدالله السعد' },
      { id: 'cli-2', company_id: tenantId, name: 'شركة الأفق للاستثمار' }
    ],
    cases: [
      {
        id: 'cas-1',
        company_id: tenantId,
        client_id: 'cli-1',
        title: 'دعوى مطالبة مالية',
        case_number: '1448/2026'
      }
    ],
    sessions: [{ id: 'ses-1', company_id: tenantId, case_id: 'cas-1', session_date: '2026-09-01' }]
  }

  const mockAttachments = {}

  it('successfully creates an encrypted .b2btenant package and verifies it in staging', () => {
    const pkg = createTenantPackage(tenantId, mockData, 'web', passphrase, mockAttachments)
    expect(typeof pkg).toBe('string')

    const result = verifyAndStageTenantPackage(pkg, passphrase, tenantId)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
    expect(result.manifest.formatVersion).toBe(2)
    expect(result.manifest.contractId).toBe('b2b-law-canonical-v2')
    expect(result.stagedData.clients.length).toBe(2)
    expect(result.stagedData.cases.length).toBe(1)
  })

  it('rejects non-empty attachment bundles in Phase R2 fail-closed until R3 streaming is ready', () => {
    const pkgWithAttachments = createTenantPackage(tenantId, mockData, 'web', passphrase, {
      'att-1': Buffer.from('test')
    })
    const result = verifyAndStageTenantPackage(pkgWithAttachments, passphrase, tenantId)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('معطلة أمنياً في المرحلة الحالية R2'))).toBe(true)
  })

  it('rejects decryption when an incorrect recovery passphrase is provided', () => {
    const pkg = createTenantPackage(tenantId, mockData, 'web', passphrase)
    const result = verifyAndStageTenantPackage(pkg, 'WrongPassword123!', tenantId)

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('كلمة مرور الاسترداد غير صحيحة'))).toBe(true)
  })

  it('rejects tampered or corrupted package contents', () => {
    const pkg = createTenantPackage(tenantId, mockData, 'desktop', passphrase)
    const parsed = JSON.parse(pkg)
    // Tamper with ciphertext
    parsed.ciphertext = parsed.ciphertext.substring(0, parsed.ciphertext.length - 10) + 'AAAAAAAAAA'
    const tampered = JSON.stringify(parsed)

    const result = verifyAndStageTenantPackage(tampered, passphrase, tenantId)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('strictly enforces tenant isolation: filters out records belonging to other tenants', () => {
    const foreignTenantId = '99999999-9999-9999-9999-999999999999'
    const mixedData: Record<string, any[]> = {
      companies: [{ id: tenantId, name: 'مكتبي' }],
      clients: [
        { id: 'cli-1', company_id: tenantId, name: 'موكل مكتبي' },
        { id: 'cli-leak', company_id: foreignTenantId, name: 'موكل مكتب آخر غريب' }
      ]
    }

    const pkg = createTenantPackage(tenantId, mixedData, 'desktop', passphrase)
    const result = verifyAndStageTenantPackage(pkg, passphrase, tenantId)

    expect(result.valid).toBe(true)
    expect(result.stagedData.clients.length).toBe(1)
    expect(result.stagedData.clients[0].id).toBe('cli-1')
  })

  it('hard-rejects a package whose manifest belongs to another authenticated tenant', () => {
    const pkg = createTenantPackage(tenantId, mockData, 'web', passphrase)
    const result = verifyAndStageTenantPackage(
      pkg,
      passphrase,
      '99999999-9999-9999-9999-999999999999'
    )
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('معرف المكتب في الحزمة لا يطابق المكتب المصادق عليه.')
    expect(result.warnings).toEqual([])
  })

  it('rejects incomplete or altered key-slot metadata before decryption', () => {
    const envelope = JSON.parse(createTenantPackage(tenantId, mockData, 'web', passphrase))
    envelope.keySlots[0].iterations = 1
    const result = verifyAndStageTenantPackage(JSON.stringify(envelope), passphrase, tenantId)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('منفذ مفتاح الاسترداد')
  })

  it('correctly adapts legacy v1 plaintext JSON snapshots to v2 canonical format', () => {
    const legacyV1 = {
      version: 1,
      tables: {
        clients: [{ id: 'legacy-cli', name: 'موكل قديم' }],
        cases: [{ id: 'legacy-cas', title: 'قضية قديمة' }]
      }
    }

    const converted = convertLegacyV1JsonToCanonical(legacyV1, tenantId)
    expect(converted.clients.length).toBe(1)
    expect(converted.clients[0].company_id).toBe(tenantId)
    expect(converted.cases.length).toBe(1)
    expect(converted.cases[0].company_id).toBe(tenantId)
  })
})
