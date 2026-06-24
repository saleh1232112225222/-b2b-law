import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const page = await context.newPage()

page.on('console', (msg) => {
  console.log(`[${msg.type()}] ${msg.text()}`.substring(0, 400))
})
page.on('pageerror', (err) => console.log('[PAGE_ERROR]', err.message.substring(0, 500)))

await page.goto('https://b2b-law.netlify.app', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(3000)

console.log('=== URL:', page.url())
console.log('=== Title:', await page.title())

// Check localStorage after
const lsAfter = await page.evaluate(() =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(localStorage).filter(
        ([k]) => k.startsWith('web_') || k.startsWith('b2b_') || k.startsWith('test')
      )
    )
  )
)
console.log('=== localStorage:', lsAfter)

// Check what route components are mounted
const routeInfo = await page.evaluate(() => {
  const app = document.getElementById('app')
  const text = app ? app.innerText : ''
  return {
    hasLoginDialog: /تسجيل دخول|مرحباً بعودتك/i.test(text),
    hasDashboard: /لوحة التحكم|ADMIN — SECURED/i.test(text),
    hasLoginForm: document.getElementById('username-input') !== null,
    textPreview: text.substring(0, 100)
  }
})
console.log('=== Route info:', JSON.stringify(routeInfo))

await page.screenshot({ path: 'login_screen.png', fullPage: true })
console.log('=== Screenshot taken')

await browser.close()
