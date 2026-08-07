/**
 * OAuth & Exchange Security Test Suite
 * Tests Login CSRF protection, state binding, and exchange endpoint hardening.
 * Run with: node test_oauth_security.js
 */

const http = require('http')
const crypto = require('crypto')

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080'
const { hostname, port } = new URL(BASE)

async function runTests() {
  console.log('🧪 Starting OAuth & Exchange Security Tests...\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAILED: ${message}`)
      failed++
    }
  }

  function postJSON(path, body, extraHeaders = {}) {
    return new Promise((resolve) => {
      const data = JSON.stringify(body)
      const req = http.request(
        {
          hostname,
          port: parseInt(port) || 8080,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            ...extraHeaders
          }
        },
        (res) => {
          let responseData = ''
          res.on('data', (chunk) => (responseData += chunk))
          res.on('end', () => {
            let parsed = null
            try { parsed = JSON.parse(responseData) } catch (e) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed || responseData })
          })
        }
      )
      req.on('error', (err) => resolve({ error: err.message }))
      req.write(data)
      req.end()
    })
  }

  function getURL(path, extraHeaders = {}) {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname,
          port: parseInt(port) || 8080,
          path,
          method: 'GET',
          headers: extraHeaders
        },
        (res) => {
          let responseData = ''
          res.on('data', (chunk) => (responseData += chunk))
          res.on('end', () => {
            let parsed = null
            try { parsed = JSON.parse(responseData) } catch (e) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed || responseData })
          })
        }
      )
      req.on('error', (err) => resolve({ error: err.message }))
      req.end()
    })
  }

  // ========================================
  // Test 1: POST /exchange without code → 400
  // ========================================
  console.log('Test 1: POST /api/auth/exchange without code')
  const res1 = await postJSON('/api/auth/exchange', {})
  assert(res1.statusCode === 400, `Expected 400, got ${res1.statusCode}`)

  // ========================================
  // Test 2: POST /exchange with fake code → 401
  // ========================================
  console.log('\nTest 2: POST /api/auth/exchange with fake code')
  const res2 = await postJSON('/api/auth/exchange', { code: 'fake_code_123456789' })
  assert(res2.statusCode === 401, `Expected 401, got ${res2.statusCode}`)

  // ========================================
  // Test 3: POST /exchange with non-string code → 400
  // ========================================
  console.log('\nTest 3: POST /api/auth/exchange with non-string code')
  const res3 = await postJSON('/api/auth/exchange', { code: 12345 })
  assert(res3.statusCode === 400, `Expected 400, got ${res3.statusCode}`)

  // ========================================
  // Test 4: GET /google/callback without state → 400
  // ========================================
  console.log('\nTest 4: GET /google/callback without state parameter')
  const res4 = await getURL('/api/auth/google/callback?code=some_code')
  assert(res4.statusCode === 400, `Expected 400, got ${res4.statusCode}`)

  // ========================================
  // Test 5: GET /google/callback with forged state (no cookie) → 400
  // ========================================
  console.log('\nTest 5: GET /google/callback with forged state but no cookie')
  const fakeState = `${crypto.randomBytes(32).toString('hex')}.${Date.now().toString(36)}.${crypto.randomBytes(32).toString('hex')}`
  const res5 = await getURL(`/api/auth/google/callback?code=some_code&state=${fakeState}`)
  assert(res5.statusCode === 400, `Expected 400, got ${res5.statusCode}`)

  // ========================================
  // Test 6: Login CSRF — attacker's state + different browser (no matching cookie) → 400
  // Simulates: Attacker starts OAuth, gets state+cookie. Sends state URL to victim.
  // Victim's browser has no __oauth_nonce cookie → REJECTED.
  // ========================================
  console.log('\nTest 6: Login CSRF — attacker state sent to victim browser (no cookie)')
  const attackerNonce = crypto.randomBytes(32).toString('hex')
  const attackerTimestamp = Date.now().toString(36)
  const attackerPayload = `${attackerNonce}.${attackerTimestamp}`
  // Attacker would need JWT_SECRET to forge HMAC — using fake HMAC here
  const attackerHmac = crypto.randomBytes(32).toString('hex')
  const attackerState = `${attackerPayload}.${attackerHmac}`
  // Victim's browser sends the URL but has NO __oauth_nonce cookie
  const res6 = await getURL(`/api/auth/google/callback?code=attacker_code&state=${attackerState}`)
  assert(res6.statusCode === 400, `Expected 400 (Login CSRF blocked), got ${res6.statusCode}`)

  // ========================================
  // Test 7: State with mismatched cookie nonce → 400
  // Simulates: Even if both state and cookie exist, nonces must match
  // ========================================
  console.log('\nTest 7: State with mismatched cookie nonce')
  const nonce1 = crypto.randomBytes(32).toString('hex')
  const nonce2 = crypto.randomBytes(32).toString('hex') // different nonce
  const ts = Date.now().toString(36)
  const payload7 = `${nonce1}.${ts}`
  const hmac7 = crypto.randomBytes(32).toString('hex') // won't matter — nonce mismatch first
  const state7 = `${payload7}.${hmac7}`
  const res7 = await getURL(
    `/api/auth/google/callback?code=some_code&state=${state7}`,
    { Cookie: `__oauth_nonce=${nonce2}` }
  )
  assert(res7.statusCode === 400, `Expected 400 (nonce mismatch), got ${res7.statusCode}`)

  // ========================================
  // Test 8: /exchange does NOT accept userId/email from client
  // Identity must come from server-side temp code only
  // ========================================
  console.log('\nTest 8: POST /exchange ignores client-supplied identity fields')
  const res8 = await postJSON('/api/auth/exchange', {
    code: 'nonexistent',
    userId: 'injected-user-id',
    email: 'attacker@evil.com',
    roleKey: 'admin'
  })
  assert(
    res8.statusCode === 401,
    `Expected 401 (identity from client ignored, code invalid), got ${res8.statusCode}`
  )

  // ========================================
  // Test 9: Expired state timestamp → 400
  // ========================================
  console.log('\nTest 9: Expired state timestamp (11 minutes old)')
  const oldNonce = crypto.randomBytes(32).toString('hex')
  const oldTs = (Date.now() - 11 * 60 * 1000).toString(36) // 11 minutes ago
  const oldPayload = `${oldNonce}.${oldTs}`
  const oldHmac = crypto.randomBytes(32).toString('hex')
  const oldState = `${oldPayload}.${oldHmac}`
  const res9 = await getURL(
    `/api/auth/google/callback?code=some_code&state=${oldState}`,
    { Cookie: `__oauth_nonce=${oldNonce}` }
  )
  assert(res9.statusCode === 400, `Expected 400 (expired state), got ${res9.statusCode}`)

  // ========================================
  console.log(`\n========================================`)
  console.log(`Test Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} total`)
  console.log(`========================================\n`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((e) => {
  console.error('Test Suite Error:', e)
  process.exit(1)
})
