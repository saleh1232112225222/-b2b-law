import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('صلاحيات المستخدم العادي', async ({ page }) => {
  await page.goto('/login')

  await page.fill('#username-input', 'user@test.com')
  await page.fill('#password-input', '123456')
  await page.click('#login-submit-btn')

  await page.waitForURL(/dashboard/)

  await expect(page.locator('text=Admin Panel')).toHaveCount(0)
})
