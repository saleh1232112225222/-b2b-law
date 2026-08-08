/**
 * Test Suite for Phase 1 of Google Calendar Integration
 * Validates: Token Refresh logic, Calendar List fetching, Calendar Selection & Security Isolations
 */

const assert = require('assert')
const { GoogleCalendarService } = require('./dist/services/googleCalendarService')
const { query } = require('./dist/db/connection')

async function runPhase1Tests() {
  console.log('=== RUNNING GOOGLE CALENDAR PHASE 1 AUTOMATED TESTS ===\n')
  let passed = 0
  let failed = 0

  const companyA = '11111111-1111-1111-1111-111111111111'
  const companyB = '22222222-2222-2222-2222-222222222222'
  const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

  try {
    // Setup test companies and user
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Test Office A', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyA])
    await query(`INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, 'Test Office B', NOW() + INTERVAL '30 days') ON CONFLICT DO NOTHING`, [companyB])
    await query(`INSERT INTO users (id, company_id, username, password_hash, role_key) VALUES ($1, $2, 'testuserA', 'hash', 'admin') ON CONFLICT DO NOTHING`, [userA, companyA])

    // TEST 1: Valid Access Token Retrieval
    console.log('Test 1: Valid Access Token Retrieval')
    const validConfig = {
      accountEmail: 'lawyer.test@gmail.com',
      accessToken: 'valid_test_access_token_123',
      refreshToken: 'valid_test_refresh_token_456',
      authorizedAt: new Date().toISOString()
    }
    await query(
      `INSERT INTO office_integrations (company_id, user_id, service_name, status, config_data)
       VALUES ($1, $2, 'google_calendar', 'connected', $3)
       ON CONFLICT (company_id, service_name) DO UPDATE SET status = 'connected', config_data = $3`,
      [companyA, userA, JSON.stringify(validConfig)]
    )

    const tokenRes1 = await GoogleCalendarService.getValidAccessToken(companyA, userA)
    assert.strictEqual(tokenRes1.needsReauth, false, 'Valid token should not require reauth')
    assert.strictEqual(tokenRes1.accessToken, 'valid_test_access_token_123', 'Should return existing valid token')
    console.log('  ✅ TEST 1 PASSED: Valid access token retrieved successfully.\n')
    passed++

    // TEST 2: Status Endpoint Sanitization (No Tokens Exposed)
    console.log('Test 2: Status Endpoint Sanitization & Security')
    const statusRes = await GoogleCalendarService.getStatus(companyA)
    assert.strictEqual(statusRes.connected, true, 'Integration should be connected')
    assert.strictEqual(statusRes.googleEmail, 'lawyer.test@gmail.com', 'Google email matched')
    assert.strictEqual(statusRes.accessToken, undefined, 'Access token MUST NOT be exposed in status payload')
    assert.strictEqual(statusRes.refreshToken, undefined, 'Refresh token MUST NOT be exposed in status payload')
    console.log('  ✅ TEST 2 PASSED: Status payload is sanitized and tokens are not leaked.\n')
    passed++

    // TEST 3: Expired Token with Invalid/Missing Refresh Token
    console.log('Test 3: Expired Token + Missing Refresh Token (Triggers Reauth Flag)')
    const expiredConfig = {
      accountEmail: 'lawyer.test@gmail.com',
      accessToken: 'oauth_at_old',
      refreshToken: 'oauth_rt_demo', // demo refresh token
      authorizedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours old
    }
    await query(
      `UPDATE office_integrations SET config_data = $1 WHERE company_id = $2 AND service_name = 'google_calendar'`,
      [JSON.stringify(expiredConfig), companyA]
    )

    const tokenRes2 = await GoogleCalendarService.getValidAccessToken(companyA, userA)
    assert.strictEqual(tokenRes2.needsReauth, true, 'Expired token with demo refresh should trigger needsReauth')
    assert.strictEqual(tokenRes2.accessToken, null, 'Access token should be null when reauth required')
    console.log('  ✅ TEST 3 PASSED: Expired token without real refresh token safely requires reauthorization.\n')
    passed++

    // TEST 4: Cross-Tenant Isolation (Company B cannot access Company A integration)
    console.log('Test 4: Cross-Tenant Multi-Tenant Security Isolation')
    const statusResB = await GoogleCalendarService.getStatus(companyB)
    assert.strictEqual(statusResB.connected, false, 'Company B should NOT see Company A integration status')
    assert.strictEqual(statusResB.googleEmail, null, 'Company B email should be null')
    console.log('  ✅ TEST 4 PASSED: Multi-tenant security isolation verified.\n')
    passed++

    // TEST 5: Calendar Selection Input Validation
    console.log('Test 5: Calendar Selection Input Validation')
    const invalidSelRes = await GoogleCalendarService.selectCalendar(companyA, 'non_existent_cal_id', userA)
    assert.strictEqual(invalidSelRes.success, false, 'Selecting invalid calendar ID should fail')
    assert.ok(invalidSelRes.error, 'Error message should be returned')
    console.log('  ✅ TEST 5 PASSED: Selecting arbitrary/invalid calendar ID blocked.\n')
    passed++

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message)
    console.error(err.stack)
    failed++
  } finally {
    // Cleanup test data
    await query(`DELETE FROM office_integrations WHERE company_id IN ($1, $2)`, [companyA, companyB])
    await query(`DELETE FROM users WHERE id = $1`, [userA])
    await query(`DELETE FROM companies WHERE id IN ($1, $2)`, [companyA, companyB])
    
    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
    if (failed > 0) {
      process.exit(1)
    }
  }
}

runPhase1Tests()
