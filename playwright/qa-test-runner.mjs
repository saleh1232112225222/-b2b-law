import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = path.resolve(__dirname, 'qa-screenshots')
const REPORT_DIR = path.resolve(__dirname)
const BASE_URL = 'https://b2b-law.netlify.app'
const MOBILE_VIEWPORT = { width: 412, height: 915 }

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

// ============================================================
// ISSUE TRACKER
// ============================================================
const issues = []

function addIssue(title, actual, expected, severity = 'متوسطة', priority = 'متوسطة') {
  issues.push({ title, actual, expected, severity, priority })
  console.log(`  ❌ [${severity}] ${title}`)
  console.log(`     الفعلي: ${actual}`)
  console.log(`     المتوقع: ${expected}`)
}

async function shot(page, name) {
  const file = `${name}.png`
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file), fullPage: false })
  return file
}

async function wait(page, ms = 1500) {
  await page.waitForTimeout(ms)
}

// ============================================================
// PHASE 1: LOGIN & BASICS
// ============================================================
async function phase01_login(browser) {
  console.log('\n========== 🟢 المرحلة 1: الأساسيات والمسارات الحرجة ==========\n')
  
  // --- 1.1 Login Test on Pixel 8 ---
  console.log('--- 1.1 تسجيل الدخول على Pixel 8 ---')
  
  const ctx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
  const page = await ctx.newPage()
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await wait(page, 2000)
    await shot(page, '01-login-page')
    console.log('  ✓ تم فتح صفحة الدخول')
    
    // Check login page for mobile
    const loginFormVisible = await page.locator('form, .v-card, input').count()
    console.log(`  حقول الإدخال: ${loginFormVisible}`)
    
    // Fill credentials
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    console.log(`  عدد الحقول: ${inputCount}`)
    
    // Try to find username and password fields
    let usernameField = page.locator('input[autocomplete="username"], input[name="username"], input:not([type="password"])').first()
    let passField = page.locator('input[type="password"]').first()
    
    const usernameExists = await usernameField.count()
    if (usernameExists === 0) {
      // Try other selectors
      const allInputs = await inputs.all()
      if (allInputs.length >= 2) {
        usernameField = allInputs[0]
        passField = allInputs[1]
      }
    }
    
    await usernameField.fill('OpenCode')
    console.log('  ✓ تم إدخال اسم المستخدم')
    
    await passField.fill('OpenCode@111')
    console.log('  ✓ تم إدخال كلمة المرور')
    
    await shot(page, '01-login-filled')
    
    // Click login button
    const loginBtn = page.locator('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل الدخول"), .v-btn--disabled + .v-btn, .v-btn.v-btn--elevated').first()
    const btnCount = await loginBtn.count()
    console.log(`  أزرار الدخول: ${btnCount}`)
    
    if (btnCount > 0) {
      await loginBtn.click()
      await wait(page, 3000)
      await page.waitForLoadState('networkidle').catch(() => {})
      await wait(page, 1000)
      
      const currentUrl = page.url()
      await shot(page, '02-after-login')
      console.log(`  ✓ URL بعد الدخول: ${currentUrl}`)
      
      // Check for mobile layout
      const hasBottomNav = await page.locator('.mobile-bottom-nav, .v-bottom-navigation').count()
      const hasHeader = await page.locator('.mobile-header, .v-app-bar').count()
      console.log(`  BottomNav: ${hasBottomNav}, Header: ${hasHeader}`)
      
      if (hasBottomNav === 0) {
        addIssue(
          'تخطيط الجوال لا يظهر بعد تسجيل الدخول',
          `لا يوجد Bottom Navigation (تم العثور على ${hasBottomNav})`,
          'ظهور MobileAppShell مع BottomNav (5 أزرار)',
          'حرجة', 'قبل الإطلاق'
        )
      }
      
      // --- 1.2 Test different screen sizes ---
      console.log('\n--- 1.2 اختبار 5 أحجام شاشة ---')
      await ctx.close()
      
      const sizes = [
        { name: 'iPhone SE', w: 375, h: 667 },
        { name: 'iPhone 15 Pro', w: 393, h: 852 },
        { name: 'Pixel 8', w: 412, h: 915 },
        { name: 'Galaxy S24', w: 360, h: 780 },
        { name: 'iPad Mini', w: 744, h: 1133 }
      ]
      
      for (const size of sizes) {
        const sCtx = await browser.newContext({ viewport: { width: size.w, height: size.h } })
        const sPage = await sCtx.newPage()
        
        await sPage.goto(BASE_URL, { waitUntil: 'networkidle' })
        await wait(sPage, 2000)
        
        // Login
        const sInputs = sPage.locator('input')
        const sAllInputs = await sInputs.all()
        if (sAllInputs.length >= 2) {
          await sAllInputs[0].fill('OpenCode')
          await sAllInputs[1].fill('OpenCode@111')
        }
        const sBtn = sPage.locator('button[type="submit"], button:has-text("دخول")').first()
        if (await sBtn.count() > 0) await sBtn.click()
        await wait(sPage, 3000)
        await sPage.waitForLoadState('networkidle').catch(() => {})
        await wait(sPage, 1000)
        
        const sHasBottomNav = await sPage.locator('.mobile-bottom-nav, .v-bottom-navigation').count()
        await shot(sPage, `01-size-${size.name.replace(/\s/g, '')}`)
        console.log(`  ${size.name} (${size.w}×${size.h}): BottomNav=${sHasBottomNav}`)
        
        if (sHasBottomNav === 0) {
          addIssue(
            `تصميم الجوال لا يظهر على ${size.name} (${size.w}×${size.h})`,
            `لا يوجد Bottom Navigation`,
            'ظهور MobileAppShell',
            'مرتفعة', 'قبل الإطلاق'
          )
        }
        
        await sCtx.close()
      }
      
      // --- 1.3 Test Bottom Navigation ---
      console.log('\n--- 1.3 اختبار أزرار التنقل السفلي ---')
      
      const navCtx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
      const navPage = await navCtx.newPage()
      
      await navPage.goto(BASE_URL, { waitUntil: 'networkidle' })
      await wait(navPage, 2000)
      const nInputs = await navPage.locator('input').all()
      if (nInputs.length >= 2) {
        await nInputs[0].fill('OpenCode')
        await nInputs[1].fill('OpenCode@111')
      }
      const nBtn = navPage.locator('button[type="submit"], button:has-text("دخول")').first()
      if (await nBtn.count() > 0) await nBtn.click()
      await wait(navPage, 3000)
      await navPage.waitForLoadState('networkidle').catch(() => {})
      await wait(navPage, 1000)
      
      const navButtons = [
        { label: 'لوحة التحكم', path: '/dashboard' },
        { label: 'العملاء', path: '/clients' },
        { label: 'القضايا', path: '/cases' },
        { label: 'الجلسات', path: '/sessions' },
        { label: 'المزيد', path: null }
      ]
      
      for (const nav of navButtons) {
        const btn = navPage.locator(`.v-bottom-navigation button:has-text("${nav.label}"), .mobile-bottom-nav button:has-text("${nav.label}")`).first()
        const exists = await btn.count()
        
        if (exists > 0) {
          await btn.click()
          await wait(navPage, 2000)
          await shot(navPage, `01-nav-${nav.label}`)
          console.log(`  ✓ "${nav.label}": ${navPage.url()}`)
          
          // Check if page loaded with content
          const pageContent = await navPage.locator('.v-main, .mobile-app-shell, main').count()
          console.log(`     محتوى الصفحة: ${pageContent > 0 ? 'موجود' : 'فارغ'}`)
        } else {
          addIssue(
            `زر "${nav.label}" غير موجود في Bottom Navigation`,
            `لم يتم العثور على الزر`,
            `ظهور الزر "${nav.label}" في شريط التنقل السفلي`,
            'مرتفعة', 'قبل الإطلاق'
          )
        }
      }
      
      await navCtx.close()
      
      // --- 1.4 Test Drawer ---
      console.log('\n--- 1.4 اختبار القائمة الجانبية (Drawer) ---')
      
      const drawCtx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
      const drawPage = await drawCtx.newPage()
      
      await drawPage.goto(BASE_URL, { waitUntil: 'networkidle' })
      await wait(drawPage, 2000)
      const dInputs = await drawPage.locator('input').all()
      if (dInputs.length >= 2) {
        await dInputs[0].fill('OpenCode')
        await dInputs[1].fill('OpenCode@111')
      }
      const dBtn = drawPage.locator('button[type="submit"], button:has-text("دخول")').first()
      if (await dBtn.count() > 0) await dBtn.click()
      await wait(drawPage, 3000)
      await drawPage.waitForLoadState('networkidle').catch(() => {})
      await wait(drawPage, 1000)
      
      // Open drawer via hamburger menu
      const hamburger = drawPage.locator('.v-app-bar button, .mobile-header button').first()
      if (await hamburger.count() > 0) {
        await hamburger.click()
        await wait(drawPage, 1000)
        await shot(drawPage, '01-drawer-open')
        console.log('  ✓ تم فتح القائمة الجانبية')
        
        const drawerItems = await drawPage.locator('.v-navigation-drawer .v-list-item, .mobile-drawer .v-list-item').count()
        console.log(`  عدد العناصر في القائمة: ${drawerItems}`)
        
        // Close drawer by clicking scrim
        const scrim = drawPage.locator('.v-overlay__scrim, .v-navigation-drawer__scrim').first()
        if (await scrim.count() > 0) {
          await scrim.click({ force: true }).catch(() => {})
          await wait(drawPage, 500)
        } else {
          // Press Escape as fallback
          await drawPage.keyboard.press('Escape').catch(() => {})
          await wait(drawPage, 500)
        }
        console.log('  ✓ تم إغلاق القائمة الجانبية')
      } else {
        addIssue(
          'زر القائمة (Hamburger) غير موجود في Header الجوال',
          'لا يوجد زر',
          'ظهور زر لفتح القائمة الجانبية',
          'حرجة', 'قبل الإطلاق'
        )
      }
      
      // --- 1.5 Test Lougout ---
      console.log('\n--- 1.5 اختبار تسجيل الخروج ---')
      
      await hamburger.click()
      await wait(drawPage, 800)
      
      const logoutBtn = drawPage.locator('button:has-text("تسجيل الخروج"), .v-list-item:has-text("الخروج")').first()
      if (await logoutBtn.count() > 0) {
        await logoutBtn.click()
        await wait(drawPage, 3000)
        await shot(drawPage, '01-after-logout')
        console.log(`  ✓ URL بعد الخروج: ${drawPage.url()}`)
        
        if (!drawPage.url().includes('login')) {
          addIssue(
            'تسجيل الخروج لا يعيد التوجيه لصفحة الدخول',
            `URL الحالي: ${drawPage.url()}`,
            'التوجيه إلى /login',
            'حرجة', 'قبل الإطلاق'
          )
        }
      } else {
        addIssue(
          'زر تسجيل الخروج غير موجود في القائمة الجانبية',
          'لا يوجد زر',
          'ظهور زر "تسجيل الخروج"',
          'مرتفعة', 'قبل الإطلاق'
        )
      }
      
      await drawCtx.close()
      
    } else {
      addIssue(
        'زر تسجيل الدخول غير موجود',
        'لم يتم العثور على زر الإرسال',
        'ظهور زر "دخول" أو "تسجيل الدخول"',
        'حرجة', 'قبل الإطلاق'
      )
    }
    
  } catch (e) {
    console.error(`  ❌ خطأ: ${e.message}`)
    addIssue(
      'خطأ تقني أثناء اختبار تسجيل الدخول',
      e.message,
      'إكمال اختبار تسجيل الدخول بنجاح',
      'حرجة', 'قبل الإطلاق'
    )
  }
  
  await ctx.close().catch(() => {})
  return page
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   اختبار B2B-LAW للجوال - جلسة اختبار حي    ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`الرابط: ${BASE_URL}`)
  console.log(`المستخدم: OpenCode`)
  console.log(`تاريخ: ${new Date().toISOString()}\n`)
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=412,915', '--window-position=0,0']
  })
  
  try {
    // Phase 1
    await phase01_login(browser)
    
    // Continue with more phases as we go...
    
  } catch (e) {
    console.error(`\n❌ خطأ رئيسي: ${e.message}`)
  } finally {
    await browser.close()
  }
  
  // Print summary
  console.log('\n══════════════════════════════════════════════')
  console.log('📊 ملخص الاختبار')
  console.log('══════════════════════════════════════════════')
  console.log(`إجمالي المشاكل المكتشفة: ${issues.length}`)
  
  const critical = issues.filter(i => i.severity === 'حرجة')
  const high = issues.filter(i => i.severity === 'مرتفعة')
  const medium = issues.filter(i => i.severity === 'متوسطة')
  const low = issues.filter(i => i.severity === 'منخفضة')
  
  console.log(`🔴 حرجة: ${critical.length}`)
  console.log(`🟠 مرتفعة: ${high.length}`)
  console.log(`🟡 متوسطة: ${medium.length}`)
  console.log(`🟢 منخفضة: ${low.length}`)
  
  // Write report
  let report = `# تقرير اختبار الجوال - B2B-LAW\n\n`
  report += `- **التاريخ**: ${new Date().toISOString()}\n`
  report += `- **الرابط**: ${BASE_URL}\n`
  report += `- **المستخدم**: OpenCode\n`
  report += `- **حجم الشاشة**: ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height}\n\n`
  report += `## ملخص المشاكل\n\n`
  report += `| المستوى | العدد |\n|---------|------|\n`
  report += `| 🔴 حرجة | ${critical.length} |\n| 🟠 مرتفعة | ${high.length} |\n| 🟡 متوسطة | ${medium.length} |\n| 🟢 منخفضة | ${low.length} |\n`
  report += `| **الإجمالي** | **${issues.length}** |\n\n`
  
  if (issues.length > 0) {
    report += `## تفاصيل المشاكل\n\n`
    issues.forEach((issue, i) => {
      report += `### #${i + 1}: ${issue.title}\n\n`
      report += `- **الخطورة**: ${issue.severity}\n`
      report += `- **الأولوية**: ${issue.priority}\n`
      report += `- **النتيجة الحالية**: ${issue.actual}\n`
      report += `- **النتيجة المتوقعة**: ${issue.expected}\n`
      report += `\n---\n\n`
    })
  }
  
  fs.writeFileSync(path.join(REPORT_DIR, 'qa-report-phase1.md'), report, 'utf-8')
  console.log(`\n📝 تم حفظ التقرير في: playwright/qa-report-phase1.md`)
}

main()
