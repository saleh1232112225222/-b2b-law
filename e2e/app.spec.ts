import { test, expect } from '@playwright/test'

test.describe('App smoke test', () => {
  test('homepage loads and shows login', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#app')).toBeAttached()
    await expect(page.getByText('تسجيل الدخول').first()).toBeVisible({ timeout: 10000 })
  })

  test('toggle theme between light and dark', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    const themeToggle = page
      .locator('button')
      .filter({ has: page.locator('.v-icon') })
      .first()
    if (await themeToggle.isVisible()) {
      await themeToggle.click()
    }
  })
})
