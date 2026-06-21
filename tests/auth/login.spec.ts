import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

test('تسجيل دخول admin', async ({ page }) => {
  await page.goto('/login')

  await page.fill('input[name="username"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/dashboard/)
})
