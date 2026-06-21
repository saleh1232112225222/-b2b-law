import { test, expect } from '@playwright/test'

async function loginAs(page, _username, _password) {
  await page.goto('https://b2b-law.netlify.app/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin1390')
  await page.click('button[type="submit"]')
  await page.waitForURL(/(dashboard|login)/, { timeout: 15000 })
}

test('مدخل النظام يرى جميع الصفحات', async ({ page }) => {
  await loginAs(page, 'admin', 'admin1390')

  const pages = ['/dashboard', '/clients', '/defendants', '/poa', '/cases', '/sessions', '/tasks', '/documents', '/drafting', '/memoranda', '/finance', '/contracts', '/enforcement', '/communications', '/employees', '/settings', '/users', '/reports', '/archive', '/search', '/firm']

  for (const p of pages) {
    await page.goto(`https://b2b-law.netlify.app/#${p}`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForTimeout(800)
    const redirected = page.url().includes('login')
    console.log(`  ${redirected ? '✗' : '✓'} ${p}`)
    expect(redirected).toBe(false)
  }
})
