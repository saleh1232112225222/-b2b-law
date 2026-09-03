import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOT_DIR = path.resolve('playwright', 'qa-screenshots')
const BASE_URL = 'https://b2b-law.netlify.app'
const MOBILE_VIEWPORT = { width: 412, height: 915 } // Pixel 8

// Ensure screenshot dir exists
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const issues: Issue[] = []

interface Issue {
  title: string
  steps: string[]
  actual: string
  expected: string
  severity: 'حرجة' | 'مرتفعة' | 'متوسطة' | 'منخفضة'
  priority: 'قبل الإطلاق' | 'مرتفعة' | 'متوسطة' | 'منخفضة'
  screenshot?: string
}

function logIssue(page: Page, issue: Omit<Issue, 'steps'>) {
  const full: Issue = {
    ...issue,
    steps: [] // filled by caller
  }
  issues.push(full)
}

async function screenshot(page: Page, name: string) {
  const file = `${name}.png`
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file), fullPage: false })
  return file
}

async function waitForApp(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {})
}

async function login(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await screenshot(page, '01-login-page')

  // Fill login form
  const usernameField = page
    .locator('input[type="text"], input[name="username"], input:not([type="password"])')
    .first()
  await usernameField.fill('OpenCode')

  const passField = page.locator('input[type="password"]').first()
  await passField.fill('OpenCode@111')

  const loginBtn = page
    .locator(
      'button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل"), .v-btn--is-elevated'
    )
    .first()
  await loginBtn.click()

  await page.waitForTimeout(3000)
  await waitForApp(page)
  await screenshot(page, '02-after-login')
}

// ============================================================
// PHASE 1: BASIC TESTING - LOGIN & NAVIGATION
// ============================================================
test.describe('المرحلة 1: الأساسيات والمسارات الحرجة', () => {
  test('1.1 تسجيل الدخول على شاشة Pixel 8', async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT })
    const page = await context.newPage()

    try {
      await login(page)

      // Check if we got past login
      const currentUrl = page.url()
      console.log(`URL after login: ${currentUrl}`)

      // Check for mobile layout elements
      const hasBottomNav = await page.locator('.mobile-bottom-nav, .v-bottom-navigation').count()
      console.log(`Bottom nav found: ${hasBottomNav > 0}`)

      const hasHeader = await page.locator('.mobile-header, .v-app-bar').count()
      console.log(`Mobile header found: ${hasHeader > 0}`)

      // Check current page
      const pageTitle = await page
        .locator('.v-toolbar-title, .mobile-header-title, h1, h2')
        .first()
        .textContent()
        .catch(() => 'unknown')
      console.log(`Page title: ${pageTitle}`)

      if (hasBottomNav === 0 || hasHeader === 0) {
        logIssue(page, {
          title: 'قد لا يظهر تخطيط الجوال بعد تسجيل الدخول',
          actual: `BottomNav: ${hasBottomNav}, Header: ${hasHeader}, URL: ${currentUrl}`,
          expected: 'ظهور تصميم الجوال (MobileAppShell) بعد تسجيل الدخول',
          severity: 'حرجة',
          priority: 'قبل الإطلاق'
        })
      }
    } catch (e) {
      console.error('Login error:', e)
      logIssue(page, {
        title: 'خطأ في تسجيل الدخول',
        actual: String(e),
        expected: 'تسجيل الدخول بنجاح والانتقال للوحة التحكم',
        severity: 'حرجة',
        priority: 'قبل الإطلاق'
      })
    }

    await context.close()
  })

  test('1.2 اختبار على 5 أحجام شاشة مختلفة', async ({ browser }) => {
    const sizes = [
      { name: 'iPhone SE', w: 375, h: 667 },
      { name: 'iPhone 15 Pro', w: 393, h: 852 },
      { name: 'Pixel 8', w: 412, h: 915 },
      { name: 'Galaxy S24', w: 360, h: 780 },
      { name: 'iPad Mini', w: 744, h: 1133 }
    ]

    for (const size of sizes) {
      const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } })
      const pg = await ctx.newPage()

      await login(pg)

      // Check for mobile layout indicators
      const hasBottomNav = await pg.locator('.mobile-bottom-nav, .v-bottom-navigation').count()
      const bodyText = await pg
        .locator('body')
        .textContent()
        .catch(() => '')

      console.log(`[${size.name}] BottomNav: ${hasBottomNav}, URL: ${pg.url()}`)

      await screenshot(pg, `01-size-${size.name.replace(/\s/g, '')}`)

      if (hasBottomNav === 0) {
        logIssue(pg, {
          title: `تخطيط الجوال لا يظهر على شاشة ${size.name} (${size.w}×${size.h})`,
          actual: `لا يوجد Bottom Navigation`,
          expected: 'ظهور MobileAppShell مع BottomNav و Header',
          severity: size.w < 500 ? 'حرجة' : 'مرتفعة',
          priority: 'قبل الإطلاق'
        })
      }

      await ctx.close()
    }
  })

  test('1.3 اختبار أزرار التنقل السفلي', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
    const pg = await ctx.newPage()
    await login(pg)

    const navButtons = ['لوحة التحكم', 'العملاء', 'القضايا', 'الجلسات', 'المزيد']

    for (const btn of navButtons) {
      const found = pg.locator(`button:has-text("${btn}"), .v-btn:has-text("${btn}")`)
      const count = await found.count()
      console.log(`Nav button "${btn}": ${count} found`)

      if (count > 0) {
        await found.first().click()
        await pg.waitForTimeout(1500)
        await screenshot(pg, `01-nav-${btn}`)
        console.log(`  URL after click: ${pg.url()}`)
      } else {
        logIssue(pg, {
          title: `زر التنقل "${btn}" غير موجود في Bottom Navigation`,
          actual: 'الزر غير موجود',
          expected: `ظهور زر "${btn}" في شريط التنقل السفلي`,
          severity: 'مرتفعة',
          priority: 'قبل الإطلاق'
        })
      }
    }

    await ctx.close()
  })

  test('1.4 اختبار القائمة الجانبية (Drawer)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
    const pg = await ctx.newPage()
    await login(pg)

    // Click hamburger menu
    const menuBtn = pg.locator('button:has(.mdi-menu), .v-app-bar button').first()
    await menuBtn.click()
    await pg.waitForTimeout(1000)
    await screenshot(pg, '01-drawer-open')

    // Check drawer is open
    const drawerItems = pg.locator('.v-navigation-drawer .v-list-item, .mobile-drawer .v-list-item')
    const itemCount = await drawerItems.count()
    console.log(`Drawer items count: ${itemCount}`)

    // Click each drawer item
    const items = [
      'المهام',
      'المالية',
      'المستندات',
      'المذكرات',
      'العقود',
      'التنفيذ',
      'الملفات',
      'التقارير',
      'الملف الشخصي',
      'الإعدادات'
    ]

    for (const item of items) {
      const drawerBtn = pg.locator(
        `.v-navigation-drawer .v-list-item:has-text("${item}"), .v-list-item:has-text("${item}")`
      )
      const count = await drawerBtn.count()
      if (count > 0) {
        await drawerBtn.first().click()
        await pg.waitForTimeout(2000)
        await screenshot(pg, `01-drawer-${item}`)
        console.log(`Drawer "${item}" -> URL: ${pg.url()}`)

        // Check if mobile or desktop layout
        const hasMobileHeader = await pg.locator('.mobile-header').count()
        if (hasMobileHeader === 0) {
          console.log(`  ⚠️ "${item}" does NOT have mobile layout - showing desktop view`)
        }

        // Go back to dashboard and reopen drawer
        await pg.goto(`${BASE_URL}/#/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
        await pg.waitForTimeout(1500)
        await menuBtn.click()
        await pg.waitForTimeout(800)
      } else {
        logIssue(pg, {
          title: `رابط "${item}" غير موجود في القائمة الجانبية`,
          actual: 'الرابط غير موجود',
          expected: `ظهور "${item}" في قائمة Drawer`,
          severity: 'متوسطة',
          priority: 'مرتفعة'
        })
      }
    }

    await ctx.close()
  })

  test('1.5 اختبار تسجيل الخروج', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE_VIEWPORT })
    const pg = await ctx.newPage()
    await login(pg)

    // Open drawer
    const menuBtn = pg.locator('button:has(.mdi-menu), .v-app-bar button').first()
    await menuBtn.click()
    await pg.waitForTimeout(1000)

    // Click logout
    const logoutBtn = pg
      .locator('button:has-text("تسجيل الخروج"), .v-btn:has-text("الخروج")')
      .first()
    await logoutBtn.click()
    await pg.waitForTimeout(2000)
    await screenshot(pg, '01-after-logout')

    console.log(`Logout URL: ${pg.url()}`)

    // Should be on login page
    const isLoginPage = pg.url().includes('login')
    if (!isLoginPage) {
      logIssue(pg, {
        title: 'تسجيل الخروج لا يعيد التوجيه لصفحة الدخول',
        actual: `URL بعد الخروج: ${pg.url()}`,
        expected: 'التوجيه إلى /login',
        severity: 'حرجة',
        priority: 'قبل الإطلاق'
      })
    }

    await ctx.close()
  })
})

// ============================================================
// RUN ALL PHASES SEQUENTIALLY AND GENERATE REPORT
// ============================================================
test.afterAll(async () => {
  // Generate markdown report
  if (issues.length > 0) {
    let report = '# تقرير اختبار الجوال - المشاكل المكتشفة\n\n'
    report += `إجمالي المشاكل: ${issues.length}\n\n`

    issues.forEach((issue, i) => {
      report += `## المشكلة #${i + 1}: ${issue.title}\n\n`
      report += `- **الخطورة**: ${issue.severity}\n`
      report += `- **الأولوية**: ${issue.priority}\n`
      report += `- **النتيجة الحالية**: ${issue.actual}\n`
      report += `- **النتيجة المتوقعة**: ${issue.expected}\n`
      if (issue.screenshot) report += `- **لقطة شاشة**: ${issue.screenshot}\n`
      report += '\n'
    })

    fs.writeFileSync(path.join(SCREENSHOT_DIR, '..', 'qa-report.md'), report, 'utf-8')
    console.log(`\n\n=== ISSUES FOUND: ${issues.length} ===`)
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. [${i.severity}] ${i.title}`))
  }
})
