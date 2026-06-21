import { test, expect } from '@playwright/test'

test('صلاحيات المستخدم العادي', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: { id: '2', username: 'user', name: 'مستخدم عادي', roleKey: 'user', is_active: true, permissions: [] }
      })
    })
  })

  await page.goto('/login')

  await page.fill('#username-input', 'user@test.com')
  await page.fill('#password-input', '123456')
  await page.click('button[type="submit"]')

  await page.waitForURL(/dashboard/)

  await expect(page.locator('text=Admin Panel')).toHaveCount(0)
})
