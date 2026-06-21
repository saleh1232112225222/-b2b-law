import { test, expect } from '@playwright/test'

test('فتح الموقع والتأكد من الصفحة', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app')

  await expect(page).toHaveTitle(/b2b/i)
})

test('تسجيل الدخول', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app/login')

  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', '123456')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/dashboard/)
})

test('تصوير الصفحة', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app')

  await page.screenshot({ path: 'homepage.png' })
})
