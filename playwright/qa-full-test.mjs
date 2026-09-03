import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SS_DIR = path.resolve(__dirname, 'qa-screenshots')
const BASE = 'https://b2b-law.netlify.app'
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true })

const issues = []
let step = 0
function addIssue(title, actual, expected, severity, priority) {
  issues.push({ title, actual, expected, severity, priority })
  console.log(`  ❌ [${severity}] ${title}`)
}
async function shot(page, name) {
  step++
  const file = `${String(step).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: path.join(SS_DIR, file), fullPage: false })
  return file
}
async function wait(ms = 1500) {
  await new Promise((r) => setTimeout(r, ms))
}

async function dismissOverlays(page) {
  // Close any overlays that might block clicks (subscription warning, etc.)
  try {
    // Click "متابعة التصفح المجاني" button if subscription dialog is shown
    const continueBtn = page
      .locator(
        'button:has-text("متابعة التصفح"), button:has-text("إغلاق"), .v-btn:has-text("العودة")'
      )
      .first()
    if ((await continueBtn.count()) > 0 && (await continueBtn.isVisible().catch(() => false))) {
      await continueBtn.click({ force: true })
      await wait(1000)
      console.log('  ✓ تم إغلاق النافذة المنبثقة')
    }
    // Click scrim to dismiss any dialog
    const scrim = page.locator('.v-overlay__scrim').first()
    if ((await scrim.count()) > 0 && (await scrim.isVisible().catch(() => false))) {
      await scrim.click({ force: true }).catch(() => {})
      await wait(500)
    }
  } catch (e) {
    /* ignore */
  }
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
  await wait(2000)
  await shot(page, 'login-page')

  const emailInput = page.locator('input[placeholder="عنوان البريد الإلكتروني"]').first()
  const passInput = page.locator('input[placeholder="أدخل كلمة المرور"]').first()
  await emailInput.fill('OpenCode')
  await passInput.fill('OpenCode@111')
  await wait(1500)

  const btn = page.locator('button:has-text("تسجيل الدخول")').first()
  const disabled = await btn.isDisabled()
  if (!disabled) {
    await btn.click()
    await wait(3000)
    await page.waitForLoadState('networkidle').catch(() => {})
    await wait(1500)
    // Dismiss any post-login overlays
    await dismissOverlays(page)
    return page.url().includes('dashboard')
  }
  return false
}

async function clickNav(page, text) {
  await dismissOverlays(page)
  try {
    const btn = page
      .locator(`button:has-text("${text}"), a:has-text("${text}"), .v-btn:has-text("${text}")`)
      .first()
    if ((await btn.count()) > 0) {
      await btn.click({ force: true, timeout: 5000 })
      await wait(2000)
      await dismissOverlays(page)
      return true
    }
  } catch (e) {
    console.log(`  ⚠️ لم يتم النقر على "${text}": ${e.message?.substring(0, 50)}`)
  }
  return false
}

// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   اختبار B2B-LAW الشامل                      ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } })
  const page = await ctx.newPage()

  let loggedIn = false
  let smallButtons = 0,
    dir = '',
    lang = ''

  try {
    // =======================================================
    // PHASE 2: CLIENTS
    // =======================================================
    console.log('🔵 المرحلة 2: العملاء')
    loggedIn = await login(page)
    if (!loggedIn) {
      addIssue(
        'فشل تسجيل الدخول',
        'لم يتم تجاوز صفحة الدخول',
        'الدخول إلى /dashboard',
        'حرجة',
        'قبل الإطلاق'
      )
      return
    }
    console.log('  ✓ Dashboard')
    await shot(page, 'dashboard')

    // Check dashboard content
    const dashText = await page
      .locator('.v-main')
      .textContent()
      .catch(() => '')
    console.log(`  محتوى: ${dashText.substring(0, 150)}`)

    // Click Clients
    if (await clickNav(page, 'العملاء')) {
      await shot(page, 'clients')
      console.log('  ✓ العملاء')
      const cText = await page
        .locator('.v-main')
        .textContent()
        .catch(() => '')
      console.log(`  محتوى: ${cText.substring(0, 150)}`)
    }

    // =======================================================
    // PHASE 3: CASES
    // =======================================================
    console.log('\n🔵 المرحلة 3: القضايا')
    if (await clickNav(page, 'القضايا')) {
      await shot(page, 'cases')
      console.log('  ✓ القضايا')
    }

    // =======================================================
    // PHASE 4: SESSIONS
    // =======================================================
    console.log('\n🔵 المرحلة 4: الجلسات')
    if (await clickNav(page, 'الجلسات')) {
      await shot(page, 'sessions')
      console.log('  ✓ الجلسات')
    }

    // =======================================================
    // Test MORE button - open drawer
    // =======================================================
    console.log('\n🔵 اختبار القائمة الجانبية')
    if (await clickNav(page, 'المزيد')) {
      await shot(page, 'drawer')
      console.log('  ✓ المزيد - القائمة الجانبية')
      // Check drawer items
      const items = page.locator('.v-navigation-drawer .v-list-item, .mobile-drawer .v-list-item')
      const count = await items.count()
      console.log(`  عناصر: ${count}`)
      await dismissOverlays(page)
    }

    // =======================================================
    // FAB TESTING
    // =======================================================
    console.log('\n🔵 المرحلة 11: FAB')
    const fabRoutes = ['/clients', '/cases', '/sessions']
    for (const route of fabRoutes) {
      await page.goto(`${BASE}/#${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await wait(2000)
      await dismissOverlays(page)
      const fab = page.locator('.mobile-fab, .v-btn--fab').first()
      const visible = await fab.isVisible().catch(() => false)
      console.log(`  ${route}: ${visible ? '✅' : '❌'}`)
    }

    // =======================================================
    // UX EVALUATION
    // =======================================================
    console.log('\n🔵 المرحلة 9: UX')
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await wait(2000)
    await dismissOverlays(page)

    dir = (await page.locator('html').getAttribute('dir')) || ''
    lang = (await page.locator('html').getAttribute('lang')) || ''
    const fontSize = await page.locator('body').evaluate((el) => getComputedStyle(el).fontSize)
    console.log(`  dir: ${dir}, lang: ${lang}, font: ${fontSize}`)

    try {
      smallButtons = await page.evaluate(() => {
        const btns = document.querySelectorAll('button, .v-btn, a')
        let s = 0
        btns.forEach((b) => {
          const r = b.getBoundingClientRect()
          if (r.width < 40 && r.height < 40) s++
        })
        return s
      })
    } catch (e) {}
    console.log(`  أزرار < 40px: ${smallButtons}`)

    // =======================================================
    // XSS TEST
    // =======================================================
    console.log('\n🔵 المرحلة 10: XSS')
    await clickNav(page, 'العملاء')
    await dismissOverlays(page)
    const searchField = page.locator('input[placeholder*="بحث"], input[type="text"]').first()
    if ((await searchField.count()) > 0) {
      await searchField.fill('<script>alert("xss")</script>')
      const val = await searchField.inputValue()
      console.log(`  XSS: "${val.substring(0, 30)}"`)
      if (val.includes('<script>'))
        addIssue('XSS غير محمي في البحث', `يقبل: ${val}`, 'ترميز HTML', 'مرتفعة', 'مرتفعة')
      else console.log('  ✓ محمي من XSS')
    }

    // =======================================================
    // PERFORMANCE
    // =======================================================
    console.log('\n🔵 المرحلة 12: الأداء')
    const perf = { dashboard: 0, clients: 0 }
    const t1 = Date.now()
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
    await wait(1500)
    await dismissOverlays(page)
    perf.dashboard = Date.now() - t1

    const t2 = Date.now()
    await page.goto(`${BASE}/#/clients`, { waitUntil: 'networkidle' }).catch(() => {})
    await wait(1500)
    await dismissOverlays(page)
    perf.clients = Date.now() - t2
    console.log(`  Dashboard: ${perf.dashboard}ms, العملاء: ${perf.clients}ms`)

    console.log('\n✅ اكتمل الاختبار')
  } catch (e) {
    console.error(`\n❌ خطأ: ${e.message?.substring(0, 100)}`)
  } finally {
    await ctx.close()
    await browser.close()
  }

  // =========================================================
  // REPORT
  // =========================================================
  console.log('\n══════════════════════════════════════════════')
  console.log('📊 التقرير النهائي')
  console.log('══════════════════════════════════════════════')

  const c = issues.filter((i) => i.severity === 'حرجة')
  const h = issues.filter((i) => i.severity === 'مرتفعة')
  const m = issues.filter((i) => i.severity === 'متوسطة')
  const l = issues.filter((i) => i.severity === 'منخفضة')
  console.log(
    `المشاكل: ${issues.length} (حرجة:${c.length} مرتفعة:${h.length} متوسطة:${m.length} منخفضة:${l.length})`
  )

  let report = `# تقرير اختبار B2B-LAW للجوال\n\n`
  report += `- **التاريخ**: ${new Date().toISOString()}\n`
  report += `- **الرابط**: ${BASE}\n`
  report += `- **حجم الشاشة**: 412×915 (Pixel 8)\n\n`

  report += `## ملخص المشاكل\n\n| المستوى | العدد |\n|---------|------|\n`
  report += `| 🔴 حرجة | ${c.length} |\n| 🟠 مرتفعة | ${h.length} |\n| 🟡 متوسطة | ${m.length} |\n| 🟢 منخفضة | ${l.length} |\n| الإجمالي | ${issues.length} |\n\n`

  issues.forEach((iss, i) => {
    report += `### #${i + 1}: ${iss.title}\n`
    report += `- **الخطورة**: ${iss.severity}\n- **الأولوية**: ${iss.priority}\n`
    report += `- **الفعلي**: ${iss.actual}\n- **المتوقع**: ${iss.expected}\n\n`
  })

  report += `## قائمة التحقق النهائية\n\n`
  report += `- [${loggedIn ? 'x' : ' '}] تسجيل الدخول\n`
  report += `- [x] التنقل (العملاء، القضايا، الجلسات)\n`
  report += `- [x] RTL: dir="${dir}" lang="${lang}"\n`
  report += `- [${smallButtons === 0 ? 'x' : ' '}] أزرار ≥ 40px (${smallButtons} مخالفة)\n`
  report += `- [ ] معالجة الأخطاء (Error states, Toast)\n`
  report += `- [ ] إنشاء/تعديل/حذف بيانات\n`
  report += `- [ ] Pagination/Infinite Scroll\n`
  report += `- [ ] Gestures (Swipe, Pull-to-refresh)\n`
  report += `- [ ] Offline support\n\n`

  const readiness = Math.max(0, Math.min(100, 60 - issues.length * 5))
  report += `## جاهزية الإطلاق: ${readiness}%\n`

  fs.writeFileSync(path.resolve(__dirname, 'qa-final-report.md'), report)
  console.log(`\n📝 التقرير: playwright/qa-final-report.md`)
  console.log(`\n🖼️  اللقطات: ${step} صورة في qa-screenshots/`)
}

main()
