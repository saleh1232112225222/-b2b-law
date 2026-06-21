import { test, expect } from '@playwright/test'

test('صلاحيات المستخدم العادي', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app/login')

  await page.fill('input[name="username"]', 'user@test.com')
  await page.fill('input[name="password"]', '123456')
  await page.click('button[type="submit"]')

  await page.waitForURL(/dashboard/)

  await expect(page.locator('text=Admin Panel')).toHaveCount(0)
})
