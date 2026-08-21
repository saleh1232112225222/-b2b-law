import { strict as assert } from 'node:assert'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const username = process.env.FINANCE_AUDIT_USER
const password = process.env.FINANCE_AUDIT_PASSWORD
const baseUrl = process.env.FINANCE_AUDIT_URL || 'http://127.0.0.1:5173'
if (!username || !password) throw new Error('Finance audit credentials are required')

await mkdir('playwright/qa-screenshots', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const device of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } }
  ]) {
    const context = await browser.newContext({ viewport: device.viewport })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 500) {
        errors.push(`${response.status()} ${response.url()}`)
      }
    })
    await page.goto(`${baseUrl}/#/login`, { waitUntil: 'networkidle' })
    const inputs = page.locator('input')
    await inputs.nth(0).fill(username)
    await inputs.nth(1).fill(password)
    await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click()
    await page.waitForTimeout(800)

    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('theme', value), theme)
      await page.goto(`${baseUrl}/#/finance`, { waitUntil: 'networkidle' })
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      assert.equal(
        await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
        theme,
        `${device.name} must apply ${theme} theme`
      )
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        clippedTabs: [...document.querySelectorAll('.v-tab')]
          .filter((tab) => tab.scrollWidth > tab.clientWidth + 1)
          .map((tab) => tab.textContent?.trim())
      }))
      assert.ok(
        layout.documentWidth <= layout.viewport + 1,
        `${device.name}/${theme} must not overflow horizontally: ${JSON.stringify(layout)}`
      )
      assert.deepEqual(
        layout.clippedTabs,
        [],
        `${device.name}/${theme} tab labels must not be clipped`
      )
      await page.screenshot({
        path: `playwright/qa-screenshots/finance-${device.name}-${theme}.png`,
        fullPage: true
      })
    }
    assert.deepEqual(errors, [], `${device.name} must not produce page/API errors`)
    await context.close()
  }
  console.log('finance-visual-regression: PASS')
} finally {
  await browser.close()
}
