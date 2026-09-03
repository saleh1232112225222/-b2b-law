import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 412, height: 915 } })

await page.goto('https://b2b-law.netlify.app/', { waitUntil: 'networkidle', timeout: 30000 })
console.log('Page title:', await page.title())

const inputs = await page.locator('input').all()
console.log('Input fields:', inputs.length)

if (inputs.length >= 2) {
  await inputs[0].fill('OpenCode')
  await inputs[1].fill('OpenCode@111')
  console.log('Filled credentials')
}

const loginBtn = page.locator('button.v-btn.v-btn--elevated, button[type="submit"]').first()
const btnExists = await loginBtn.count()
console.log('Login button:', btnExists)

if (btnExists > 0) {
  await loginBtn.click()
  await page.waitForTimeout(3000)
  await page.waitForLoadState('networkidle').catch(() => {})
  const url = page.url()
  console.log('After login URL:', url)

  if (url.includes('dashboard')) {
    console.log('✅ LOGIN SUCCESSFUL')
  } else if (url.includes('login')) {
    console.log('❌ STILL ON LOGIN PAGE')
  }

  // Take screenshot
  await page.screenshot({ path: 'playwright/qa-screenshots/login-test.png' })
  console.log('Screenshot saved')
}

await browser.close()
