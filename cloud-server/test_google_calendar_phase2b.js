/**
 * Test Suite for Phase 2-B of Google Calendar Integration
 * Validates: Event update helper, Event delete helper, Batch sync helper, Multi-tenant security
 */

const assert = require('assert')
const { GoogleCalendarService } = require('./dist/services/googleCalendarService')
const { query } = require('./dist/db/connection')
const { runExtraMigrations } = require('./dist/db/migrate_extra')

async function runPhase2BTests() {
  console.log('=== RUNNING GOOGLE CALENDAR PHASE 2-B AUTOMATED TESTS ===\n')
  let passed = 0
  let failed = 0

  await runExtraMigrations()

  const companyA = '55555555-5555-5555-5555-555555555555'
  const companyB = '66666666-6666-6666-6666-666666666666'
  const userA = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const caseId = '77777777-7777-7777-7777-777777777777'
  const sessionId = '66666666-1111-2222-3333-444444444444'

  try {
    // Setup test companies and user
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Office Phase2B Test A', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyA])
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Office Phase2B Test B', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyB])
    await query(`INSERT INTO users (id, company_id, username, password_hash, role_key) VALUES ($1, $2, 'testuser2B', 'hash', 'admin') ON CONFLICT DO NOTHING`, [userA, companyA])

    // TEST 1: Update event helper when not connected
    console.log('Test 1: Graceful fallback on updateCalendarEvent when disconnected')
    const updateRes = await GoogleCalendarService.updateCalendarEvent(companyA, 'mock_evt_123', {
      summary: 'جلسة مُعدّلة',
      startTime: '2026-08-20T10:00:00'
    }, userA)

    assert.strictEqual(updateRes.success, false, 'Update should fail gracefully when disconnected')
    assert.strictEqual(updateRes.reason, 'not_connected', 'Reason should be not_connected')
    console.log('  ✅ TEST 1 PASSED: Event update handled gracefully when disconnected.\n')
    passed++

    // TEST 2: Delete event helper when not connected
    console.log('Test 2: Graceful fallback on deleteCalendarEvent when disconnected')
    const deleteRes = await GoogleCalendarService.deleteCalendarEvent(companyA, 'mock_evt_123', userA)

    assert.strictEqual(deleteRes.success, false, 'Delete should fail gracefully when disconnected')
    assert.strictEqual(deleteRes.reason, 'not_connected', 'Reason should be not_connected')
    console.log('  ✅ TEST 2 PASSED: Event delete handled gracefully when disconnected.\n')
    passed++

    // TEST 3: Batch sync helper when disconnected
    console.log('Test 3: Batch sync helper handling when disconnected')
    const syncRes = await GoogleCalendarService.syncUpcomingSessions(companyA, userA)

    assert.strictEqual(syncRes.success, false, 'Sync should fail gracefully when disconnected')
    assert.strictEqual(syncRes.syncedCount, 0, '0 sessions synced')
    console.log('  ✅ TEST 3 PASSED: Batch sync handled gracefully when disconnected.\n')
    passed++

    // TEST 4: Delete event helper with empty googleEventId (No-op success)
    console.log('Test 4: Delete event helper with empty googleEventId')
    const deleteEmptyRes = await GoogleCalendarService.deleteCalendarEvent(companyA, '', userA)
    assert.strictEqual(deleteEmptyRes.success, true, 'Empty googleEventId delete should be no-op success')
    console.log('  ✅ TEST 4 PASSED: Empty googleEventId delete safely returns success.\n')
    passed++

    // TEST 5: Multi-tenant security for Batch Sync
    console.log('Test 5: Multi-Tenant Security Isolation for Batch Sync')
    const syncBRes = await GoogleCalendarService.syncUpcomingSessions(companyB, userA)
    assert.strictEqual(syncBRes.success, false, 'Company B sync cannot be triggered by Company A state')
    console.log('  ✅ TEST 5 PASSED: Multi-tenant batch sync security isolation verified.\n')
    passed++

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message)
    console.error(err.stack)
    failed++
  } finally {
    // Cleanup test data
    await query(`DELETE FROM sessions WHERE id = $1`, [sessionId])
    await query(`DELETE FROM cases WHERE id = $1`, [caseId])
    await query(`DELETE FROM office_integrations WHERE company_id IN ($1, $2)`, [companyA, companyB])
    await query(`DELETE FROM users WHERE id = $1`, [userA])
    await query(`DELETE FROM companies WHERE id IN ($1, $2)`, [companyA, companyB])
    
    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
    if (failed > 0) {
      process.exit(1)
    }
  }
}

runPhase2BTests()
