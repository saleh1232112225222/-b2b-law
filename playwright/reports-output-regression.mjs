import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = 'http://127.0.0.1:5173'
const outputDir = path.resolve('playwright/qa-screenshots/reports-output')
fs.mkdirSync(outputDir, { recursive: true })

const installProbes = async (context) => {
  await context.addInitScript(() => {
    window.__reportsQa = { printCalls: 0, downloads: [], opens: [], blobs: [] }
    window.print = () => {
      window.__reportsQa.printCalls += 1
    }
    window.open = (...args) => {
      window.__reportsQa.opens.push(args.map((value) => String(value ?? '')))
      return null
    }
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      window.__reportsQa.blobs.push({ type: blob?.type || '', size: blob?.size || 0 })
      return originalCreateObjectUrl(blob)
    }
    const originalAnchorClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      window.__reportsQa.downloads.push({
        download: this.download || '',
        href: String(this.href || '').slice(0, 120)
      })
      return originalAnchorClick.call(this)
    }
  })
}

const login = async (context) => {
  const page = await context.newPage()
  await page.goto(`${baseUrl}/#/login`, { waitUntil: 'networkidle' })
  await page.locator('input').nth(0).fill('admin')
  await page.locator('input').nth(1).fill('admin')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(2000)
  if (page.url().includes('/login')) throw new Error('تعذر تسجيل الدخول بحساب admin/admin')
  await page.close()
}

const openRoute = async (context, route) => {
  const page = await context.newPage()
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  return page
}

const clickPdfExport = async (page) => {
  const button = page.getByRole('button', { name: /تصدير PDF|تصدير وحفظ|حفظ وتنزيل/ }).first()
  if (!(await button.isVisible()) || !(await button.isEnabled())) throw new Error('زر PDF غير متاح')
  await button.click()
  await page.waitForTimeout(250)
  const confirm = page.getByRole('button', { name: /حفظ وتنزيل الملف/ }).first()
  if ((await confirm.count()) && (await confirm.isVisible())) {
    await confirm.click()
    await page.waitForTimeout(700)
  }
}

const pdfPageCount = (pdfPath) => {
  const content = fs.readFileSync(pdfPath).toString('latin1')
  return (content.match(/\/Type\s*\/Page\b/g) || []).length
}

const runViewport = async (browser, label, width, height) => {
  const failures = []
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ar-SA' })
  await installProbes(context)
  await login(context)

  const sessions = await openRoute(context, '/reports/sessions')
  try {
    await clickPdfExport(sessions)
    const qa = await sessions.evaluate(() => window.__reportsQa)
    if (!qa.downloads.length && !qa.opens.length) {
      failures.push(`${label}: تصدير PDF لم ينتج ملفًا أو نافذة`)
    }

    await sessions.emulateMedia({ media: 'print' })
    const filterLabel = sessions.getByText('تصفية حسب القضية', { exact: true }).first()
    if ((await filterLabel.count()) && (await filterLabel.isVisible())) {
      failures.push(`${label}: حقول التصفية ظاهرة في وضع الطباعة`)
    }

    const pdfPath = path.join(outputDir, `sessions-${label}.pdf`)
    await sessions.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    })
    if (pdfPageCount(pdfPath) !== 1) {
      failures.push(`${label}: تقرير الجلسات الفارغ لا يطبع في صفحة A4 واحدة`)
    }
  } finally {
    await sessions.close()
  }

  const reportsCenter = await openRoute(context, '/reports')
  try {
    await reportsCenter.emulateMedia({ media: 'print' })
    const printIndex = reportsCenter.getByText('فهرس التقارير المتاحة', { exact: true })
    if (!(await printIndex.isVisible()))
      failures.push(`${label}: فهرس التقارير غير ظاهر في الطباعة`)
    const centerPdfPath = path.join(outputDir, `reports-center-${label}.pdf`)
    await reportsCenter.pdf({
      path: centerPdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    })
    if (pdfPageCount(centerPdfPath) !== 1) {
      failures.push(`${label}: فهرس التقارير لا يطبع في صفحة A4 واحدة`)
    }
  } finally {
    await reportsCenter.close()
  }

  const memoranda = await openRoute(context, '/reports/memoranda')
  try {
    const printButton = memoranda.getByRole('button', { name: /طباعة/ }).first()
    if (!(await printButton.isVisible()) || !(await printButton.isEnabled()))
      throw new Error('زر طباعة المذكرات غير متاح')
    const before = await memoranda.evaluate(() => window.__reportsQa.printCalls)
    await printButton.click()
    await memoranda.waitForTimeout(350)
    const after = await memoranda.evaluate(() => window.__reportsQa.printCalls)
    if (after <= before) failures.push(`${label}: طباعة المذكرات لا تستدعي طباعة المتصفح`)
  } finally {
    await memoranda.close()
  }

  const users = await openRoute(context, '/reports/users')
  try {
    await users.evaluate(async () => {
      await window.api.reports.exportCsv('qa-users.csv', [{ username: 'qa-admin', active: true }])
    })
    await users.waitForTimeout(500)
    const qa = await users.evaluate(() => window.__reportsQa)
    const validDownload = qa.downloads.some(
      ({ download }) =>
        download.toLowerCase().endsWith('.csv') && download.toLowerCase() !== 'undefined'
    )
    const validBlob = qa.blobs.some(
      ({ size, type }) => size > 0 && type.toLowerCase().includes('csv')
    )
    if (!validDownload || !validBlob)
      failures.push(`${label}: تصدير CSV لا ينتج اسمًا ومحتوى صالحين`)
  } finally {
    await users.close()
  }

  const operations = await openRoute(context, '/reports/operations')
  try {
    const clipped = await operations.locator('button:visible').evaluateAll((buttons) =>
      buttons
        .filter((button) => /طباعة|تصدير/.test(button.textContent || ''))
        .filter((button) => {
          const rect = button.getBoundingClientRect()
          return rect.left < -1 || rect.right > window.innerWidth + 1
        })
        .map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim())
    )
    if (clipped.length) failures.push(`${label}: أزرار مقصوصة أفقيًا: ${clipped.join(', ')}`)
  } finally {
    await operations.close()
  }

  const remainingRoutes = [
    '/reports/case',
    '/reports/court-cases',
    '/reports/legal-services',
    '/reports/finance',
    '/reports/user-activity',
    '/reports/evidence',
    '/reports/documents'
  ]
  for (const route of remainingRoutes) {
    const pageErrors = []
    const page = await context.newPage()
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(450)
    const layout = await page.evaluate(() => {
      const clipped = [...document.querySelectorAll('button')]
        .filter((button) => /طباعة|تصدير/.test(button.textContent || ''))
        .filter((button) => {
          const style = getComputedStyle(button)
          if (style.display === 'none' || style.visibility === 'hidden') return false
          const rect = button.getBoundingClientRect()
          return rect.left < -1 || rect.right > window.innerWidth + 1
        })
        .map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim())
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 3,
        clipped
      }
    })
    if (layout.overflow) failures.push(`${label}: تمرير أفقي غير مطلوب في ${route}`)
    if (layout.clipped.length) {
      failures.push(`${label}: أزرار مقصوصة في ${route}: ${layout.clipped.join(', ')}`)
    }
    if (pageErrors.length)
      failures.push(`${label}: أخطاء صفحة في ${route}: ${pageErrors.join(' | ')}`)
    await page.close()
  }

  await context.close()
  return failures
}

const browser = await chromium.launch({ headless: true })
const failures = [
  ...(await runViewport(browser, 'desktop', 1440, 1000)),
  ...(await runViewport(browser, 'mobile', 390, 844))
]
await browser.close()

if (failures.length) {
  console.error('REPORTS_OUTPUT_REGRESSION: FAIL')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('REPORTS_OUTPUT_REGRESSION: PASS')
