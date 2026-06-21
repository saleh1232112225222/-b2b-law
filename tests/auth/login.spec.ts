import { test, expect } from '@playwright/test'

test('Login صحيح', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app/login')

  await page.fill('#username-input', 'admin')
  await page.fill('#password-input', 'admin1390')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/dashboard/)
})
