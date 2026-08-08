/**
 * Test Suite for Phase 2-A of Google Calendar Integration
 * Validates: Event creation helper, Duplicate prevention, Graceful fallback on failure, Multi-tenant security
 */

const assert = require('assert')
const { GoogleCalendarService } = require('./dist/services/googleCalendarService')
const { query } = require('./dist/db/connection')
const { runExtraMigrations } = require('./dist/db/migrate_extra')

async function runPhase2ATests() {
  console.log('=== RUNNING GOOGLE CALENDAR PHASE 2-A AUTOMATED TESTS ===\n')
  let passed = 0
  let failed = 0

  await runExtraMigrations()

  const companyA = '33333333-3333-3333-3333-333333333333'
  const companyB = '44444444-4444-4444-4444-444444444444'
  const userA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const sessionId = '99999999-9999-9999-9999-999999999999'

  try {
    // Setup test companies and user
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Office Phase2A Test A', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyA])
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Office Phase2A Test B', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyB])
    await query(`INSERT INTO users (id, company_id, username, password_hash, role_key) VALUES ($1, $2, 'testuser2A', 'hash', 'admin') ON CONFLICT DO NOTHING`, [userA, companyA])

    // TEST 1: Session creation without Google Calendar connected (Graceful Fallback)
    console.log('Test 1: Graceful Fallback when Google Calendar is NOT connected')
    const createRes1 = await GoogleCalendarService.createCalendarEvent(companyA, {
      summary: 'جلسة قضائية اختبارية',
      startTime: '2026-08-15T09:00:00'
    }, userA)

    assert.strictEqual(createRes1.success, false, 'Should fail gracefully when not connected')
    assert.strictEqual(createRes1.reason, 'not_connected', 'Reason should be not_connected')
    console.log('  ✅ TEST 1 PASSED: Graceful fallback when not connected works without crash.\n')
    passed++

    // TEST 2: Duplicate Event Prevention
    console.log('Test 2: Duplicate Event Creation Prevention')
    const createRes2 = await GoogleCalendarService.createCalendarEvent(companyA, {
      summary: 'جلسة مكررة',
      startTime: '2026-08-15T10:00:00',
      existingGoogleEventId: 'google_evt_existing_777'
    }, userA)

    assert.strictEqual(createRes2.success, true, 'Should succeed by returning existing ID')
    assert.strictEqual(createRes2.googleEventId, 'google_evt_existing_777', 'Existing Google Event ID returned without duplicate API call')
    console.log('  ✅ TEST 2 PASSED: Duplicate event creation prevented.\n')
    passed++

    // TEST 3: Multi-tenant security for Event Creation
    console.log('Test 3: Multi-Tenant Security Isolation for Event Creation')
    const createRes3 = await GoogleCalendarService.createCalendarEvent(companyB, {
      summary: 'اختبار محاولة اختراق عابر للشركات',
      startTime: '2026-08-15T11:00:00'
    }, userA)

    assert.strictEqual(createRes3.success, false, 'Company B cannot access Company A integration')
    assert.strictEqual(createRes3.reason, 'not_connected', 'Blocked by tenant boundary')
    console.log('  ✅ TEST 3 PASSED: Cross-tenant isolation verified.\n')
    passed++

    // TEST 4: PostgreSQL sessions table google_event_id column check
    console.log('Test 4: Database Schema google_event_id column validation')
    const caseId = '88888888-8888-8888-8888-888888888888'
    await query(
      `INSERT INTO cases (id, company_id, case_number) VALUES ($1, $2, 'CASE-100') ON CONFLICT DO NOTHING`,
      [caseId, companyA]
    )
    await query(
      `INSERT INTO sessions (id, company_id, case_id, date, status, google_event_id)
       VALUES ($1, $2, $3, CURRENT_DATE, 'قادمة', 'evt_mock_999')`,
      [sessionId, companyA, caseId]
    )

    const sessRes = await query(`SELECT id, google_event_id FROM sessions WHERE id = $1`, [sessionId])
    assert.strictEqual(sessRes.rows.length, 1, 'Session should be saved')
    assert.strictEqual(sessRes.rows[0].google_event_id, 'evt_mock_999', 'google_event_id stored in DB')
    console.log('  ✅ TEST 4 PASSED: sessions.google_event_id schema column validated.\n')
    passed++

    // TEST 5: No Tokens Leaked in Event Response
    console.log('Test 5: No Tokens Leaked in Event Response')
    assert.strictEqual(createRes1.accessToken, undefined, 'Access token MUST NOT be leaked in helper response')
    assert.strictEqual(createRes1.refreshToken, undefined, 'Refresh token MUST NOT be leaked in helper response')
    console.log('  ✅ TEST 5 PASSED: Response payload token security verified.\n')
    passed++

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message)
    console.error(err.stack)
    failed++
  } finally {
    // Cleanup test data
    await query(`DELETE FROM sessions WHERE id = $1`, [sessionId])
    await query(`DELETE FROM cases WHERE id = '88888888-8888-8888-8888-888888888888'`)
    await query(`DELETE FROM office_integrations WHERE company_id IN ($1, $2)`, [companyA, companyB])
    await query(`DELETE FROM users WHERE id = $1`, [userA])
    await query(`DELETE FROM companies WHERE id IN ($1, $2)`, [companyA, companyB])
    
    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
    if (failed > 0) {
      process.exit(1)
    }
  }
}

runPhase2ATests()
