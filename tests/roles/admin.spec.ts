import { test, expect } from '@playwright/test'

const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin1390'

async function login(page) {
  await page.goto('/login')
  await page.fill('input[name="username"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/(dashboard|login)/, { timeout: 15000 })
}

test('مدخل النظام يرى جميع الصفحات', async ({ page }) => {
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
