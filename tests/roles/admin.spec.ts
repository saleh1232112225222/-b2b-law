import { test, expect } from '@playwright/test'

async function loginAs(page, _username, _password) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: { id: '1', username: 'admin', name: 'المدير', roleKey: 'admin', is_active: true, permissions: [] }
      })
    })
  })

  await page.goto('/login')
  await page.fill('#username-input', 'admin')
  await page.fill('#password-input', 'admin1390')
  await page.click('button[type="submit"]')
  await page.waitForURL(/(dashboard|login)/, { timeout: 15000 })
}

test('مدخل النظام يرى جميع الصفحات', async ({ page }) => {
  await loginAs(page, 'admin', 'admin1390')

  const pages = ['/dashboard', '/clients', '/defendants', '/poa', '/cases', '/sessions', '/tasks', '/documents', '/drafting', '/memoranda', '/finance', '/contracts', '/enforcement', '/communications', '/employees', '/settings', '/users', '/reports', '/archive', '/search', '/firm']

  for (const p of pages) {
    await page.goto(`/#${p}`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForTimeout(800)
    const redirected = page.url().includes('login')
    console.log(`  ${redirected ? '✗' : '✓'} ${p}`)
    expect(redirected).toBe(false)
  }
})
