import { test, expect } from '@playwright/test'

async function login(page) {
  await page.goto('https://b2b-law.netlify.app/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin1390')
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
