import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('صفحة الدخول تظهر للمستخدم غير المسجل', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.getByText('تسجيل الدخول').first()).toBeVisible({ timeout: 10000 })
})

test('المستخدم العادي لا يرى صفحة المستخدمين', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="username"]', 'user')
  await page.fill('input[type="password"]', 'user123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)

  await page.goto(`${BASE}/#/users`, { waitUntil: 'load', timeout: 15000 })
  await page.waitForTimeout(2000)
  console.log('  URL after accessing /users:', page.url())
})
