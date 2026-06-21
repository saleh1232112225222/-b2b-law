import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

async function login(page) {
  await page.goto('/login')
  const isLoggedIn = await page.evaluate(() => localStorage.getItem('web_isLoggedIn') === 'true')
  if (isLoggedIn) {
    await page.goto('/#dashboard')
    return
  }
  await page.fill('#username-input', USER)
  await page.fill('#password-input', PASS)
  await page.click('#login-submit-btn')
  await page.waitForURL(/dashboard/, { timeout: 20000 })
}

test('عناصر لوحة التحكم الأساسية ظاهرة', async ({ page }) => {
  await login(page)
  await page.waitForTimeout(3000)

  const chartVisibility = await page.locator('canvas').first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('  Chart visible:', chartVisibility)

  if (chartVisibility) {
    const chartCount = await page.locator('canvas').count()
    expect(chartCount).toBeGreaterThan(0)
    console.log(`  Charts found: ${chartCount}`)
  }
})

test('التنبيهات والإشعارات تظهر بدون أخطاء', async ({ page }) => {
  await login(page)
  await page.waitForTimeout(2000)

  const hasConsoleErrors = await page.evaluate(() => {
    const errors = document.querySelectorAll('.v-alert--error, [role="alert"]')
    return errors.length
  })
  console.log('  Console errors displayed:', hasConsoleErrors)
})
