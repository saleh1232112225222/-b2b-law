import http from 'http'
import https from 'https'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080'
const credentials = { username: 'admin', password: 'admin123' }

async function request(method: string, path: string, body?: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers
    }
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function runTests() {
  console.log(`\n🧪 Testing API at ${BASE_URL}\n`)
  let passed = 0,
    failed = 0

  const check = async (name: string, fn: () => Promise<boolean>) => {
    try {
      const ok = await fn()
      if (ok) {
        console.log(`  ✓ ${name}`)
        passed++
      } else {
        console.log(`  ✗ ${name}`)
        failed++
      }
    } catch (err) {
      console.log(`  ✗ ${name}: ${err}`)
      failed++
    }
  }

  await check('Health check', async () => {
    const r = await request('GET', '/health')
    return r.status === 200 && r.data.status === 'ok'
  })

  await check('Login with valid credentials', async () => {
    const r = await request('POST', '/api/auth/login', credentials)
    if (r.status === 200 && r.data.token) {
      process.env.TOKEN = r.data.token
      return true
    }
    return false
  })

  const token = process.env.TOKEN

  await check('Login rejects invalid password', async () => {
    const r = await request('POST', '/api/auth/login', { username: 'admin', password: 'wrong' })
    return r.status === 401
  })

  await check('Get session with valid token', async () => {
    const r = await request('GET', '/api/auth/session', undefined, token)
    return r.status === 200 && r.data.username
  })

  await check('GET /api/clients (empty list)', async () => {
    const r = await request('GET', '/api/clients', undefined, token)
    return r.status === 200 && Array.isArray(r.data.data)
  })

  await check('POST /api/clients (create)', async () => {
    const r = await request(
      'POST',
      '/api/clients',
      { name: 'عميل اختبار', phone: '0555000000' },
      token
    )
    return r.status === 201 && r.data.id
  })

  await check('GET /api/cases/analytics/dashboard', async () => {
    const r = await request('GET', '/api/reports/dashboard', undefined, token)
    return r.status === 200
  })

  await check('Unauthorized request returns 401', async () => {
    const r = await request('GET', '/api/clients')
    return r.status === 401
  })

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
