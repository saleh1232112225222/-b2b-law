import { test, expect } from '@playwright/test'

async function login(page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: { id: '1', username: 'admin', name: 'المدير', roleKey: 'admin', is_active: true, permissions: [] }
      })
    })
  })

  await page.goto('/login')
  await page.fill('#username-input', 'admin')
  await page.fill('#password-input', 'admin1390')
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
