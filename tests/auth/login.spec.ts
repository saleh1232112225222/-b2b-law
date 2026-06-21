import { test, expect } from '@playwright/test'

test('تسجيل دخول admin', async ({ page }) => {
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

  await page.goto('https://b2b-law.netlify.app/login');

  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin1390');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/dashboard/);
});
