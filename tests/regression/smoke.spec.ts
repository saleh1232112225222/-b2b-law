import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('Smoke Test - فتح الصفحات الأساسية', async ({ page }) => {
  await page.goto(BASE)

  await expect(page).toHaveTitle(/law/i)

  await page.goto(`${BASE}/login`)
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})
