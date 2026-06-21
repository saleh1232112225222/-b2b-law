import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

test('تسجيل دخول admin', async ({ page }) => {
  await page.goto('/login')

  await page.fill('#username-input', USER)
  await page.fill('#password-input', PASS)
  await page.click('#login-submit-btn')

  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 })
})
