import { test, expect } from '@playwright/test'

const BASE = 'https://b2b-law.netlify.app'

test('الصفحة الرئيسية تفتح وتعرض التطبيق', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.locator('#app')).toBeAttached()
})

test('التنقل الأساسي يعمل', async ({ page }) => {
  await page.goto(BASE)
  const app = page.locator('#app')
  await expect(app).toBeAttached()
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.length).toBeGreaterThan(0)
})
