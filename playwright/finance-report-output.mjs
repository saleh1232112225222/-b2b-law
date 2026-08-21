import { strict as assert } from 'node:assert'
import { chromium } from '@playwright/test'

const username = process.env.FINANCE_AUDIT_USER
const password = process.env.FINANCE_AUDIT_PASSWORD
const baseUrl = process.env.FINANCE_AUDIT_URL || 'http://127.0.0.1:5173'
if (!username || !password) throw new Error('Finance audit credentials are required')

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${baseUrl}/#/login`, { waitUntil: 'networkidle' })
  const inputs = page.locator('input')
  await inputs.nth(0).fill(username)
  await inputs.nth(1).fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click()
  await page.waitForTimeout(1000)
  assert.ok(await page.evaluate(() => localStorage.getItem('b2b_cloud_token')), 'real login must complete')
  await page.goto(`${baseUrl}/#/finance`, { waitUntil: 'networkidle' })

  await page.locator('.v-tab').filter({ hasText: 'حسابات المكتب' }).click({ timeout: 5000 })
  await page.waitForTimeout(800)
  assert.ok(await page.getByText('الإجمالي:', { exact: false }).count(), 'mobile office rows must render')
  await page.screenshot({
    path: 'playwright/qa-screenshots/finance-mobile-office-report.png',
    fullPage: true
  })

  await page.evaluate(() => {
    window.__financePrintCalled = false
    window.__financeDownloadName = ''
    window.print = () => { window.__financePrintCalled = true }
    HTMLAnchorElement.prototype.click = function () {
      window.__financeDownloadName = this.download
    }
  })
  await page.locator('button').filter({ has: page.locator('.mdi-printer') }).click({ timeout: 5000 })
  assert.equal(await page.evaluate(() => window.__financePrintCalled), true, 'mobile print control must call print')

  await page.getByRole('button', { name: 'CSV', exact: true }).click({ timeout: 5000 })
  await page.waitForFunction(() => window.__financeDownloadName.endsWith('.csv'), null, { timeout: 10000 })
  assert.ok(
    (await page.evaluate(() => window.__financeDownloadName)).endsWith('.csv'),
    'mobile export must produce a CSV file'
  )
  assert.deepEqual(errors, [], 'report output must not trigger page errors')
  await context.close()
  console.log('finance-report-output: PASS')
} finally {
  await browser.close()
}
