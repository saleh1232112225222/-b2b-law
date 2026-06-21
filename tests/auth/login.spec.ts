import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('تسجيل الدخول بمستخدم وكلمة مرور صحيحين', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.getByText('تسجيل الدخول').first()).toBeVisible({ timeout: 10000 })

  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[type="password"]', 'admin1390')
  await page.click('button[type="submit"]')

  await page.waitForURL(/dashboard/, { timeout: 15000 })
  await expect(page).toHaveURL(/dashboard/)
})

test('ظهور رسالة خطأ عند إدخال بيانات خاطئة', async ({ page }) => {
  await page.goto(`${BASE}/login`)

  await page.fill('input[name="username"]', 'wrong')
  await page.fill('input[type="password"]', 'wrong')
  await page.click('button[type="submit"]')

  await expect(page.locator('text=خطأ').or(page.locator('text=خطأ في')).first()).toBeVisible({ timeout: 8000 })
})
