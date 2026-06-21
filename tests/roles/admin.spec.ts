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

test('مدخل النظام يرى جميع الصفحات', async ({ page }) => {
  test.setTimeout(60000)
  await login(page)

  const pages = ['/dashboard', '/clients', '/defendants', '/poa', '/cases', '/sessions', '/tasks', '/documents', '/drafting', '/memoranda', '/finance', '/contracts', '/enforcement', '/communications', '/employees', '/settings', '/users', '/reports', '/archive', '/search', '/firm']

  for (const p of pages) {
    await page.goto(`/#${p}`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForTimeout(800)
    const redirected = page.url().includes('login')
    console.log(`  ${redirected ? '✗' : '✓'} ${p}`)
    expect(redirected).toBe(false)
  }
})
