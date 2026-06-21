import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('Smoke Test - فتح الصفحات الأساسية', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/law/i)

  await page.goto('/login')
  await expect(page.locator('#login-submit-btn')).toBeVisible()
})
