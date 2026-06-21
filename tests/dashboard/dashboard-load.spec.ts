import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

async function login(page) {
  await page.goto('/login')
  await page.fill('input[name="username"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 15000 })
}

test('لوحة التحكم تظهر بعد تسجيل الدخول', async ({ page }) => {
  await login(page)
  await expect(page.locator('#app')).toBeAttached()
  await expect(page).toHaveURL(/dashboard/)
  await page.screenshot({ path: 'test-dashboard-load.png', fullPage: true })
})

test('بطاقات الإحصائيات ظاهرة في لوحة التحكم', async ({ page }) => {
  await login(page)
  await page.waitForTimeout(3000)
  const cards = page.locator('.v-card, .dashboard-card, .stat-card, [class*="card"]')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)
})
