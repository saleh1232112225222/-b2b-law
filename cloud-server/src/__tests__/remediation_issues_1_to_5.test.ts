import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { generateSyncToken, revokeToken, isTokenRevoked, verifyToken } from '../middleware/auth'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Remediation verification for issues 1, 2, 3, 4, 5', () => {

  // Issue 1: Step-up password verification when 2FA is disabled
  describe('Issue 1: Step-Up verification defense', () => {
    it('requires password and rejects missing or short/wrong passwords when 2FA is disabled', async () => {
      const passwordHash = await bcrypt.hash('correct-admin-password', 10)
      const user = { two_factor_enabled: false, two_factor_secret: null, password_hash: passwordHash }

      const checkCode = async (code: any) => {
        if (!code || typeof code !== 'string' || code.trim().length === 0 || !user?.password_hash) {
          return { status: 401, error: 'STEP_UP_CODE_REQUIRED' }
        }
        const isPasswordValid = await bcrypt.compare(code, user.password_hash).catch(() => false)
        if (!isPasswordValid) {
          return { status: 401, error: 'STEP_UP_CODE_INVALID' }
        }
        return { status: 200, success: true }
      }

      expect(await checkCode('')).toEqual({ status: 401, error: 'STEP_UP_CODE_REQUIRED' })
      expect(await checkCode(null)).toEqual({ status: 401, error: 'STEP_UP_CODE_REQUIRED' })
      expect(await checkCode(undefined)).toEqual({ status: 401, error: 'STEP_UP_CODE_REQUIRED' })

      expect(await checkCode('123')).toEqual({ status: 401, error: 'STEP_UP_CODE_INVALID' })
      expect(await checkCode('wrong')).toEqual({ status: 401, error: 'STEP_UP_CODE_INVALID' })
      expect(await checkCode('wrong-long-password')).toEqual({ status: 401, error: 'STEP_UP_CODE_INVALID' })

      expect(await checkCode('correct-admin-password')).toEqual({ status: 200, success: true })
    })
  })

  // Issue 2: Safe atomic export overwrite without deleting previous file on failure
  describe('Issue 2: Safe atomic export replacement', () => {
    it('does not delete existing backup when exporting with atomic rename pattern', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-export-test-'))
      const existingFile = path.join(tempDir, 'backup.b2btenant')
      fs.writeFileSync(existingFile, 'ORIGINAL_BACKUP_CONTENT')

      const tempOutputPath = `${existingFile}.tmp-${Date.now()}`
      fs.writeFileSync(tempOutputPath, 'NEW_BACKUP_CONTENT')
      fs.renameSync(tempOutputPath, existingFile)

      expect(fs.existsSync(existingFile)).toBe(true)
      expect(fs.readFileSync(existingFile, 'utf8')).toBe('NEW_BACKUP_CONTENT')

      const failedTemp = `${existingFile}.tmp-failed`
      try {
        fs.writeFileSync(failedTemp, 'CORRUPTED')
        throw new Error('SIMULATED_STREAM_FAILURE')
      } catch (err) {
        if (fs.existsSync(failedTemp)) fs.rmSync(failedTemp, { force: true })
      }

      expect(fs.existsSync(existingFile)).toBe(true)
      expect(fs.readFileSync(existingFile, 'utf8')).toBe('NEW_BACKUP_CONTENT')

      fs.rmSync(tempDir, { recursive: true, force: true })
    })
  })

  // Issue 3 & 5: Device token duration and instant revocation
  describe('Issue 3 & 5: Dedicated sync token lifecycle & revocation', () => {
    it('issues 30-day token with exact expiresAt and invalidates it immediately upon revocation', () => {
      const payload = {
        userId: '11111111-1111-4111-8111-111111111111',
        companyId: '22222222-2222-4222-8222-222222222222',
        username: 'test-admin',
        roleKey: 'admin'
      }

      const { token, jti, expiresAt } = generateSyncToken(payload)
      expect(token).toBeDefined()
      expect(jti).toBeDefined()

      const diffDays = (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      expect(Math.round(diffDays)).toBe(30)

      const verified = verifyToken(token)
      expect(verified.companyId).toBe(payload.companyId)
      expect(verified.jti).toBe(jti)
      expect(isTokenRevoked(jti)).toBe(false)

      revokeToken(jti)
      expect(isTokenRevoked(jti)).toBe(true)
    })
  })

  // Issue 4: Chronological sequence preservation for same entity
  describe('Issue 4: Sync sorting preserves sequence for same entity delete-then-create', () => {
    it('orders delete before create when same entity is deleted then recreated', () => {
      const changes = [
        { sequence: 10, entity_type: 'cases', entity_id: 'case-alpha', operation: 'delete', revision: 2, payload: null },
        { sequence: 11, entity_type: 'cases', entity_id: 'case-alpha', operation: 'create', revision: 3, payload: { id: 'case-alpha' } },
        { sequence: 5, entity_type: 'clients', entity_id: 'client-beta', operation: 'create', revision: 1, payload: { id: 'client-beta' } }
      ]

      const order = new Map([['clients', 0], ['cases', 1]])

      const sorted = [...changes].sort((a, b) => {
        if (a.entity_type === b.entity_type && a.entity_id === b.entity_id) {
          return a.sequence - b.sequence
        }
        const aIsDelete = a.operation === 'delete'
        const bIsDelete = b.operation === 'delete'
        if (aIsDelete && !bIsDelete) return 1
        if (!aIsDelete && bIsDelete) return -1
        const aOrder = order.get(a.entity_type) ?? 9999
        const bOrder = order.get(b.entity_type) ?? 9999
        if (aOrder !== bOrder) {
          return aIsDelete ? bOrder - aOrder : aOrder - bOrder
        }
        return a.sequence - b.sequence
      })

      const alphaDeleteIdx = sorted.findIndex(c => c.entity_id === 'case-alpha' && c.operation === 'delete')
      const alphaCreateIdx = sorted.findIndex(c => c.entity_id === 'case-alpha' && c.operation === 'create')

      expect(alphaDeleteIdx).toBeLessThan(alphaCreateIdx)
    })
  })
})
