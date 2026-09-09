import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'
const BASE = 'https://b2b-law.netlify.app'

// All major pages to benchmark
const PAGES = [
  { name: 'لوحة التحكم', path: '/dashboard', hash: '#/dashboard' },
  { name: 'القضايا', path: '/cases', hash: '#/cases' },
  { name: 'العملاء', path: '/clients', hash: '#/clients' },
  { name: 'الجلسات', path: '/sessions', hash: '#/sessions' },
  { name: 'المالية', path: '/finance', hash: '#/finance' },
  { name: 'المهام', path: '/tasks', hash: '#/tasks' },
  { name: 'التقارير', path: '/reports', hash: '#/reports' },
  { name: 'المستندات', path: '/documents', hash: '#/documents' },
  { name: 'الموظفون', path: '/employees', hash: '#/employees' },
  { name: 'الإعدادات', path: '/settings', hash: '#/settings' },
  { name: 'سجل النشاط', path: '/activity', hash: '#/activity' },
  { name: 'التوكيلات', path: '/poa', hash: '#/poa' },
  { name: 'العقود', path: '/contracts', hash: '#/contracts' },
  { name: 'المذكرات', path: '/memoranda', hash: '#/memoranda' },
  { name: 'التنفيذ', path: '/enforcement', hash: '#/enforcement' },
]

interface ApiCall {
  url: string
  method: string
  status: number
  durationMs: number
  sizeBytes: number
}

interface PageMetrics {
  page: string
  path: string
  fullLoadMs: number
  apiCalls: ApiCall[]
  totalApiTimeMs: number
  transferSizeKB: number
}

interface NavigationMetrics {
  from: string
  to: string
  navigationMs: number
  apiCalls: ApiCall[]
}

// Results storage
const pageResults: PageMetrics[] = []
const navigationResults: NavigationMetrics[] = []

test.describe('🚀 B2B-LAW Performance Benchmark', () => {
  
  test.setTimeout(180_000) // 3 minutes total

  test('1️⃣ قياس سرعة تسجيل الدخول', async ({ page }) => {
    const loginStart = Date.now()
    
    await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
    const pageLoadTime = Date.now() - loginStart
    console.log(`\n📄 صفحة تسجيل الدخول: ${pageLoadTime}ms`)

    // Login flow timing
    const loginFlowStart = Date.now()
    await page.fill('#username-input', USER)
    await page.fill('#password-input', PASS)
    await page.click('#login-submit-btn')
    
    // Hash routing: wait for hash to change to #/dashboard
    await page.waitForFunction(() => window.location.hash.includes('dashboard'), { timeout: 45000 })
    await page.waitForLoadState('networkidle')
    const loginFlowTime = Date.now() - loginFlowStart
    
    console.log(`🔑 وقت تسجيل الدخول حتى لوحة التحكم: ${loginFlowTime}ms`)
    console.log(`  ✅ تسجيل الدخول ${loginFlowTime < 5000 ? 'سريع' : loginFlowTime < 10000 ? 'مقبول' : '⚠️ بطيء'}`)
    
    // Save auth state for subsequent tests
    await page.context().storageState({ path: 'playwright/.auth/perf-admin.json' })
  })

  test('2️⃣ قياس أداء تحميل كل صفحة', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/perf-admin.json'
    })
    const page = await context.newPage()
    
    for (const p of PAGES) {
      const apiCalls: ApiCall[] = []
      let transferSize = 0

      // Intercept network requests
      page.on('response', async (response) => {
        const url = response.url()
        if (url.includes('/api/')) {
          const timing = response.request().timing()
          apiCalls.push({
            url: url.replace(/(https?:\/\/[^/]+)/, ''),
            method: response.request().method(),
            status: response.status(),
            durationMs: Math.round(timing.responseEnd - timing.requestStart),
            sizeBytes: (await response.body().catch(() => Buffer.alloc(0))).length
          })
        }
        try {
          const body = await response.body().catch(() => Buffer.alloc(0))
          transferSize += body.length
        } catch {}
      })

      const start = Date.now()
      await page.goto(`${BASE}/${p.hash}`, { waitUntil: 'networkidle' })
      const fullLoadMs = Date.now() - start

      const totalApiTime = apiCalls.reduce((sum, c) => sum + c.durationMs, 0)

      const result: PageMetrics = {
        page: p.name,
        path: p.path,
        fullLoadMs,
        apiCalls,
        totalApiTimeMs: totalApiTime,
        transferSizeKB: Math.round(transferSize / 1024)
      }
      
      pageResults.push(result)

      // Log individual page
      const status = fullLoadMs < 2000 ? '🟢' : fullLoadMs < 4000 ? '🟡' : '🔴'
      console.log(`${status} ${p.name} (${p.path}): ${fullLoadMs}ms | API: ${apiCalls.length} calls (${totalApiTime}ms) | Transfer: ${result.transferSizeKB}KB`)
      
      page.removeAllListeners('response')
      await page.waitForTimeout(500)
    }

    // Print summary table
    console.log('\n\n' + '='.repeat(100))
    console.log('📊 ملخص أداء تحميل الصفحات')
    console.log('='.repeat(100))
    
    for (const r of pageResults) {
      const icon = r.fullLoadMs < 2000 ? '🟢' : r.fullLoadMs < 4000 ? '🟡' : '🔴'
      console.log(`${icon} ${r.page} (${r.path}): ${r.fullLoadMs}ms | API: ${r.apiCalls.length} (${r.totalApiTimeMs}ms) | ${r.transferSizeKB}KB`)
    }

    const avgLoad = Math.round(pageResults.reduce((s, r) => s + r.fullLoadMs, 0) / pageResults.length)
    const maxLoad = Math.max(...pageResults.map(r => r.fullLoadMs))
    const slowest = pageResults.find(r => r.fullLoadMs === maxLoad)
    
    console.log(`\n📊 متوسط وقت التحميل: ${avgLoad}ms`)
    console.log(`📊 أبطأ صفحة: ${slowest?.page} (${maxLoad}ms)`)

    await context.close()
  })

  test('3️⃣ قياس سرعة الانتقال بين الصفحات (SPA Navigation)', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/perf-admin.json'
    })
    const page = await context.newPage()
    
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const navSequences = [
      { from: 'لوحة التحكم', to: 'القضايا', hash: '#/cases' },
      { from: 'القضايا', to: 'العملاء', hash: '#/clients' },
      { from: 'العملاء', to: 'الجلسات', hash: '#/sessions' },
      { from: 'الجلسات', to: 'المالية', hash: '#/finance' },
      { from: 'المالية', to: 'المهام', hash: '#/tasks' },
      { from: 'المهام', to: 'التقارير', hash: '#/reports' },
      { from: 'التقارير', to: 'المستندات', hash: '#/documents' },
      { from: 'المستندات', to: 'لوحة التحكم', hash: '#/dashboard' },
    ]

    console.log('\n🔄 قياس سرعة الانتقال بين الصفحات (SPA)')
    console.log('='.repeat(80))

    for (const nav of navSequences) {
      const apiCalls: ApiCall[] = []

      page.on('response', async (response) => {
        const url = response.url()
        if (url.includes('/api/')) {
          const timing = response.request().timing()
          apiCalls.push({
            url: url.replace(/(https?:\/\/[^/]+)/, ''),
            method: response.request().method(),
            status: response.status(),
            durationMs: Math.round(timing.responseEnd - timing.requestStart),
            sizeBytes: 0
          })
        }
      })

      const navStart = Date.now()
      await page.evaluate((hash) => {
        window.location.hash = hash.replace('#', '')
      }, nav.hash)
      await page.waitForLoadState('networkidle')
      const navTime = Date.now() - navStart

      navigationResults.push({ from: nav.from, to: nav.to, navigationMs: navTime, apiCalls })

      const status = navTime < 1000 ? '🟢' : navTime < 3000 ? '🟡' : '🔴'
      console.log(`${status} ${nav.from} → ${nav.to}: ${navTime}ms (${apiCalls.length} API calls)`)
      
      page.removeAllListeners('response')
      await page.waitForTimeout(300)
    }

    const avgNav = Math.round(navigationResults.reduce((s, r) => s + r.navigationMs, 0) / navigationResults.length)
    console.log(`\n📊 متوسط وقت الانتقال: ${avgNav}ms`)
    console.log(`📊 أسرع انتقال: ${Math.min(...navigationResults.map(r => r.navigationMs))}ms`)
    console.log(`📊 أبطأ انتقال: ${Math.max(...navigationResults.map(r => r.navigationMs))}ms`)

    await context.close()
  })

  test('4️⃣ قياس سرعة استجابة API Endpoints', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/perf-admin.json'
    })
    const page = await context.newPage()

    console.log('\n🌐 قياس سرعة استجابة API Endpoints')
    console.log('='.repeat(80))

    const allApiCalls: { endpoint: string; method: string; durationMs: number; status: number; sizeKB: number }[] = []

    for (const p of PAGES.slice(0, 8)) {
      page.on('response', async (response) => {
        const url = response.url()
        if (url.includes('/api/')) {
          const timing = response.request().timing()
          const body = await response.body().catch(() => Buffer.alloc(0))
          allApiCalls.push({
            endpoint: url.replace(/(https?:\/\/[^/]+)/, ''),
            method: response.request().method(),
            durationMs: Math.round(timing.responseEnd > 0 ? timing.responseEnd - timing.requestStart : 0),
            status: response.status(),
            sizeKB: Math.round(body.length / 1024 * 10) / 10
          })
        }
      })

      await page.goto(`${BASE}/${p.hash}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      page.removeAllListeners('response')
    }

    allApiCalls.sort((a, b) => b.durationMs - a.durationMs)
    
    for (const api of allApiCalls) {
      const status = api.durationMs < 500 ? '🟢' : api.durationMs < 2000 ? '🟡' : '🔴'
      console.log(`${status} ${api.endpoint.substring(0, 50)} | ${api.method} | ${api.status} | ${api.durationMs}ms | ${api.sizeKB}KB`)
    }

    const avgApiTime = allApiCalls.length > 0 
      ? Math.round(allApiCalls.reduce((s, a) => s + a.durationMs, 0) / allApiCalls.length) 
      : 0
    const slowApis = allApiCalls.filter(a => a.durationMs > 2000)
    
    console.log(`\n📊 إجمالي طلبات API: ${allApiCalls.length}`)
    console.log(`📊 متوسط وقت الاستجابة: ${avgApiTime}ms`)
    console.log(`📊 طلبات بطيئة (> 2s): ${slowApis.length}`)

    await context.close()
  })

  test('5️⃣ قياس حجم JavaScript و الموارد', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/perf-admin.json'
    })
    const page = await context.newPage()
    
    const resourceSizes: { type: string; url: string; sizeKB: number }[] = []

    page.on('response', async (response) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] || ''
      const body = await response.body().catch(() => Buffer.alloc(0))
      const sizeKB = Math.round(body.length / 1024 * 10) / 10

      let type = 'other'
      if (contentType.includes('javascript') || url.endsWith('.js')) type = 'JavaScript'
      else if (contentType.includes('css') || url.endsWith('.css')) type = 'CSS'
      else if (contentType.includes('image') || url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) type = 'Image'
      else if (contentType.includes('font') || url.match(/\.(woff|woff2|ttf|eot)/)) type = 'Font'
      else if (contentType.includes('json')) type = 'JSON/API'
      else if (contentType.includes('html')) type = 'HTML'

      if (sizeKB > 0) {
        resourceSizes.push({ type, url: url.replace(/(https?:\/\/[^/]+)/, '').substring(0, 60), sizeKB })
      }
    })

    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    console.log('\n📦 تحليل حجم الموارد (Resource Breakdown)')
    console.log('='.repeat(80))

    const byType: Record<string, { count: number; totalKB: number }> = {}
    for (const r of resourceSizes) {
      if (!byType[r.type]) byType[r.type] = { count: 0, totalKB: 0 }
      byType[r.type].count++
      byType[r.type].totalKB += r.sizeKB
    }

    let totalKB = 0
    for (const [type, data] of Object.entries(byType).sort((a, b) => b[1].totalKB - a[1].totalKB)) {
      console.log(`📁 ${type}: ${data.count} files — ${Math.round(data.totalKB)}KB`)
      totalKB += data.totalKB
    }
    console.log(`\n📊 إجمالي: ${resourceSizes.length} files — ${Math.round(totalKB)}KB (${(totalKB / 1024).toFixed(1)}MB)`)

    // Top 10 largest files
    console.log('\n📁 أكبر 10 ملفات:')
    resourceSizes.sort((a, b) => b.sizeKB - a.sizeKB)
    resourceSizes.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.type}] ${r.url} — ${r.sizeKB}KB`)
    })

    await context.close()
  })
})
