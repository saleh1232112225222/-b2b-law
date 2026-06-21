import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

async function login(page) {
  await page.goto('/login')
  const isLoggedIn = await page.evaluate(() => localStorage.getItem('web_isLoggedIn') === 'true')
  if (isLoggedIn) {
    await page.goto('/#dashboard')
    return
  }
  await page.fill('#username-input', USER)
  await page.fill('#password-input', PASS)
  await page.click('#login-submit-btn')
  await page.waitForURL(/dashboard/, { timeout: 20000 })
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

  await page.goto('/#/dashboard', { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  expect(page.url()).toContain('login')
})
