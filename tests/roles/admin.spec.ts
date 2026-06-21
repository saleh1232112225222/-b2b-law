import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

async function loginAs(page, username, password) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="username"]', username)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/(dashboard|login)/, { timeout: 15000 })
}

test('مدخل النظام يرى جميع الصفحات', async ({ page }) => {
  await loginAs(page, 'admin', 'admin1390')

  const pages = ['/dashboard', '/clients', '/defendants', '/poa', '/cases', '/sessions', '/tasks', '/documents', '/drafting', '/memoranda', '/finance', '/contracts', '/enforcement', '/communications', '/employees', '/settings', '/users', '/reports', '/archive', '/search', '/firm']

  for (const p of pages) {
    await page.goto(`${BASE}/#${p}`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForTimeout(800)
    const redirected = page.url().includes('login')
    console.log(`  ${redirected ? '✗' : '✓'} ${p}`)
    expect(redirected).toBe(false)
  }
})
