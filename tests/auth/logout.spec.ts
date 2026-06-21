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

test('تسجيل الخروج والعودة لصفحة الدخول', async ({ page }) => {
  await login(page)

  const logoutBtn = page.locator('button:has-text("تسجيل الخروج")')
  await expect(logoutBtn).toBeVisible({ timeout: 5000 })
  await logoutBtn.click()

  await page.waitForURL(/login/, { timeout: 10000 })
  await expect(page.getByText('تسجيل الدخول').first()).toBeVisible({ timeout: 5000 })
})

test('عدم الوصول للوحة التحكم بعد تسجيل الخروج', async ({ page }) => {
  await login(page)
  const logoutBtn = page.locator('button:has-text("تسجيل الخروج")')
  await logoutBtn.click()
  await page.waitForURL(/login/, { timeout: 10000 })

  await page.goto('/#/dashboard', { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  expect(page.url()).toContain('login')
})
