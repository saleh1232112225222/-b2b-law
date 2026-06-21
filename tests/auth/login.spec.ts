import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('Login صحيح', async ({ page }) => {
  await page.goto(`${BASE}/login`)

  await page.fill('#username-input', 'admin')
  await page.fill('#password-input', 'admin1390')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/dashboard/)
})

test('Login فاشل - بيانات خاطئة', async ({ page }) => {
  await page.goto(`${BASE}/login`)

  await page.fill('#username-input', 'wrong@test.com')
  await page.fill('#password-input', 'wrong')

  await page.click('button[type="submit"]')

  await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 8000 })
})
