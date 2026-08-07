/**
 * OAuth & Exchange Security Test Suite
 * Run with: node test_oauth_security.js
 */

const http = require('http')

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

  // Helper HTTP POST
  function postJSON(path, body) {
    return new Promise((resolve) => {
      const data = JSON.stringify(body)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8080,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        },
        (res) => {
          let responseData = ''
          res.on('data', (chunk) => (responseData += chunk))
          res.on('end', () => {
            let parsed = null
            try {
              parsed = JSON.parse(responseData)
            } catch (e) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed || responseData })
          })
        }
      )
      req.on('error', (err) => resolve({ error: err.message }))
      req.write(data)
      req.end()
    })
  }

  // Helper HTTP GET
  function getURL(path) {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8080,
          path,
          method: 'GET'
        },
        (res) => {
          let responseData = ''
          res.on('data', (chunk) => (responseData += chunk))
          res.on('end', () => {
            let parsed = null
            try {
              parsed = JSON.parse(responseData)
            } catch (e) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed || responseData })
          })
        }
      )
      req.on('error', (err) => resolve({ error: err.message }))
      req.end()
    })
  }

  console.log('Test 1: Direct POST to /api/auth/exchange without code')
  const res1 = await postJSON('/api/auth/exchange', {})
  assert(res1.statusCode === 400, `Expected status 400, got ${res1.statusCode}`)

  console.log('\nTest 2: Direct POST to /api/auth/exchange with fake/invalid code')
  const res2 = await postJSON('/api/auth/exchange', { code: 'fake_code_123456789' })
  assert(res2.statusCode === 401, `Expected status 401, got ${res2.statusCode}`)

  console.log('\nTest 3: Google Callback without state parameter')
  const res3 = await getURL('/api/auth/google/callback?code=some_google_code')
  assert(res3.statusCode === 400, `Expected status 400 for missing state, got ${res3.statusCode}`)

  console.log(`\n========================================`)
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`)
  console.log(`========================================\n`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((e) => {
  console.error('Test Suite Error:', e)
  process.exit(1)
})
