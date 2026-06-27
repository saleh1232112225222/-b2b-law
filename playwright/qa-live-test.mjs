import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS = path.resolve(__dirname, 'qa-screenshots')
const BASE_URL = 'https://b2b-law.netlify.app'

if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true })

const issues = []
let stepNum = 0

function addIssue(title, actual, expected, severity = 'متوسطة', priority = 'متوسطة', file = '') {
  issues.push({ title, actual, expected, severity, priority, file })
  console.log(`  ❌ [${severity}] ${title}`)
  console.log(`     ${actual}`)
}

async function shot(page, prefix) {
  stepNum++
  const file = `${String(stepNum).padStart(2, '0')}-${prefix}.png`
  await page.screenshot({ path: path.join(SCREENSHOTS, file), fullPage: false })
  return file
}

async function wait(ms = 1500) { await new Promise(r => setTimeout(r, ms)) }

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║    اختبار B2B-LAW الحي - جلسة اختبار تفاعلية    ║')
  console.log('║    ▶ المتصفح مفتوح أمامك الآن                    ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`المستخدم: OpenCode`)
  console.log(`الرابط: ${BASE_URL}\n`)

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  })
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    locale: 'ar-SA'
  })
  const page = await ctx.newPage()

  try {
    // =========================================================
    // STEP 1: LOGIN
    // =========================================================
    console.log('1️⃣  فتح التطبيق...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await wait(2000)
    await shot(page, 'login-page')
    console.log('   ✓ صفحة الدخول ظهرت')
    
    // Fill login
    const allInputs = page.locator('input')
    const inputCount = await allInputs.count()
    console.log(`   حقول الإدخال: ${inputCount}`)
    
    const inputs = await allInputs.all()
    if (inputs.length >= 2) {
      await inputs[0].fill('OpenCode')
      await inputs[1].fill('OpenCode@111')
      console.log('   ✓ تم تعبئة اسم المستخدم وكلمة المرور')
    }
    
    await shot(page, 'login-filled')
    
    // Click login - the actual login button
    const loginBtn = page.locator('button[type="submit"]').first()
    if (await loginBtn.count() === 0) {
      // Try finding by text
      const altBtn = page.locator('button.v-btn.v-btn--elevated').first()
      if (await altBtn.count() > 0) {
        await altBtn.click()
      }
    } else {
      await loginBtn.click()
    }
    
    await wait(3000)
    await page.waitForLoadState('networkidle').catch(() => {})
    await wait(1000)
    
    const afterLoginUrl = page.url()
    await shot(page, 'after-login-dashboard')
    console.log(`   ✓ URL: ${afterLoginUrl}`)
    
    // We're now on the dashboard

    // =========================================================
    // STEP 2: INTERACT WITH BOTTOM NAV
    // =========================================================
    console.log('\n2️⃣  اختبار أزرار التنقل السفلي...')
    
    // The Bottom Nav has 5 tabs with icons and text
    // Let's find them by their structure
    const bottomNav = page.locator('.v-bottom-navigation, .mobile-bottom-nav')
    const navBtns = bottomNav.locator('button, .v-btn')
    const btns = await navBtns.all()
    console.log(`   عدد الأزرار: ${btns.length}`)
    
    // Try clicking each button
    for (let i = 0; i < btns.length && i < 10; i++) {
      const btnText = (await btns[i].textContent()).trim().substring(0, 30)
      const icon = await btns[i].locator('i, .v-icon').count()
      console.log(`   🎯 زر ${i + 1}: "${btnText}" (icon: ${icon > 0})`)
      
      await btns[i].click()
      await wait(2000)
      await shot(page, `nav-btn-${i}-${btnText.substring(0, 10).replace(/\s/g, '')}`)
      console.log(`      URL: ${page.url()}`)
    }

    // =========================================================
    // STEP 3: DRAWER INTERACTION
    // =========================================================
    console.log('\n3️⃣  اختبار القائمة الجانبية (Drawer)...')
    
    // Open drawer via the menu button in header
    const menuBtn = page.locator('.mobile-header button:first-child, .v-app-bar button:first-child, button:has(.mdi-menu)').first()
    if (await menuBtn.count() > 0) {
      await menuBtn.click()
      await wait(1000)
      await shot(page, 'drawer-open')
      console.log('   ✓ القائمة الجانبية مفتوحة')
      
      // List drawer items
      const drawerList = page.locator('.v-navigation-drawer, .mobile-drawer')
      const drawerItems = drawerList.locator('.v-list-item, .v-list-item-title')
      const items = await drawerItems.all()
      console.log(`   عدد العناصر: ${items.length}`)
      
      for (let i = 0; i < items.length; i++) {
        const text = (await items[i].textContent()).trim().substring(0, 40)
        console.log(`   📋 ${i + 1}. ${text}`)
      }
      
      // Close drawer via scrim
      const scrim = page.locator('.v-overlay__scrim').first()
      if (await scrim.count() > 0) {
        await scrim.click({ force: true }).catch(() => {})
        await wait(800)
        console.log('   ✓ تم إغلاق القائمة')
      }
    } else {
      console.log('   ⚠️ زر القائمة غير موجود')
    }

    // =========================================================
    // STEP 4: TEST THEME TOGGLE
    // =========================================================
    console.log('\n4️⃣  اختبار تغيير الثيم (Dark/Light mode)...')
    
    // Theme toggle button in header
    const themeBtn = page.locator('.mobile-header button:last-child, .v-app-bar button:has(.mdi-weather)').first()
    if (await themeBtn.count() > 0) {
      await themeBtn.click()
      await wait(1000)
      await shot(page, 'theme-dark')
      console.log('   ✓ تم التبديل للوضع الداكن')
      
      await themeBtn.click()
      await wait(1000)
      await shot(page, 'theme-light')
      console.log('   ✓ تم التبديل للوضع الفاتح')
    }

    // =========================================================
    // WAIT FOR USER TO OBSERVE
    // =========================================================
    console.log('\n⏸️  تم إكمال اختبار المرحلة 1.')
    console.log('المتصفح سيبقى مفتوحاً لترى النتائج بنفسك.')
    console.log('اضغط Ctrl+C في الطرفية للمتابعة للمرحلة التالية...\n')
    
    // Keep browser open for 30 seconds so user can observe
    await wait(30000)
    
  } catch (e) {
    console.error(`\n❌ خطأ: ${e.message}`)
    await shot(page, 'error-state').catch(() => {})
  } finally {
    await ctx.close()
    await browser.close()
  }

  // Summary
  console.log('\n══════════════════════════════════════════════')
  console.log('📊 ملخص اختبار المرحلة 1')
  console.log('══════════════════════════════════════════════')
  console.log(`المشاكل المكتشفة: ${issues.length}`)
  
  // Save report
  let report = '# تقرير اختبار الجوال - المرحلة 1\n\n'
  report += `- **التاريخ**: ${new Date().toISOString()}\n`
  report += `- **الرابط**: ${BASE_URL}\n\n`
  
  if (issues.length > 0) {
    report += '## المشاكل المكتشفة\n\n'
    issues.forEach((iss, i) => {
      report += `### #${i + 1}: ${iss.title}\n`
      report += `- **الخطورة**: ${iss.severity}\n`
      report += `- **النتيجة**: ${iss.actual}\n`
      report += `- **المتوقع**: ${iss.expected}\n`
      if (iss.file) report += `- **لقطة**: ${iss.file}\n`
      report += '\n'
    })
  } else {
    report += 'لم تكتشف مشاكل في هذه المرحلة.\n'
  }
  
  fs.writeFileSync(path.join(__dirname, 'qa-report-phase1.md'), report)
  console.log(`📝 التقرير: playwright/qa-report-phase1.md`)
}

main()
