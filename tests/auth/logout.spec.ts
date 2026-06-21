import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

async function login(page) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[type="password"]', 'admin1390')
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 15000 })
}

test('تسجيل الخروج والعودة لصفحة الدخول', async ({ page }) => {
  await login(page)

  const logoutBtn = page.locator('button:has-text("تسجيل الخروج")')
  await expect(logoutBtn).toBeVisible({ timeout: 5000 })
  await logoutBtn.click()

  await page.waitForURL(/login/, { timeout: 10000 })
  await expect(page.getByText('تسجيل الدخول').first()).toBeVisible({ timeout: 5000 })
})

test('عدم الوصول للوحة التحكم بعد تسجيل الخروج', async ({ page }) => {
  await login(page)
  const logoutBtn = page.locator('button:has-text("تسجيل الخروج")')
  await logoutBtn.click()
  await page.waitForURL(/login/, { timeout: 10000 })

  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  expect(page.url()).toContain('login')
})
