import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('صلاحيات المستخدم العادي', async ({ page }) => {
  await page.goto(`${BASE}/login`)

  await page.fill('#username-input', 'user@test.com')
  await page.fill('#password-input', '123456')
  await page.click('button[type="submit"]')

  await page.waitForURL(/dashboard/)

  await expect(page.locator('text=Admin Panel')).toHaveCount(0)
})
