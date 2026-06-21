import { test as setup } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'
const authFile = 'playwright/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('#username-input', USER)
  await page.fill('#password-input', PASS)
  await page.click('#login-submit-btn')

  // Wait for redirection
  await page.waitForURL(/dashboard/, { timeout: 20000 })

  // Save session state (cookies & localStorage)
  await page.context().storageState({ path: authFile })
})
