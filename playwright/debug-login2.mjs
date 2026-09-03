import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 412, height: 915 } })

await page.goto('https://b2b-law.netlify.app/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)

const btnBefore = await page.locator('button:has-text("تسجيل الدخول")').first()
const isDisabledBefore = await btnBefore.isDisabled()
console.log('Button disabled BEFORE filling:', isDisabledBefore)

// Fill by placeholder
const emailInput = page.locator('input[placeholder="عنوان البريد الإلكتروني"]').first()
const passInput = page.locator('input[placeholder="أدخل كلمة المرور"]').first()

await emailInput.click()
await emailInput.fill('OpenCode')
console.log('Filled username')

await passInput.click()
await passInput.fill('OpenCode@111')
console.log('Filled password')

await page.waitForTimeout(1000)

const btnAfter = page.locator('button:has-text("تسجيل الدخول")').first()
const isDisabledAfter = await btnAfter.isDisabled()
const btnClasses = await btnAfter.getAttribute('class')
console.log('Button disabled AFTER filling:', isDisabledAfter)
console.log('Button classes:', btnClasses?.substring(0, 100))

if (!isDisabledAfter) {
  await btnAfter.click()
  await page.waitForTimeout(3000)
  await page.waitForLoadState('networkidle').catch(() => {})
  console.log('URL after click:', page.url())
} else {
  // Maybe the field expects email format
  console.log('\nTrying with email format...')
  await emailInput.fill('')
  await emailInput.fill('OpenCode@test.com')
  await page.waitForTimeout(1000)
  const isDisabled2 = await btnAfter.isDisabled()
  console.log('Button disabled with email:', isDisabled2)

  if (!isDisabled2) {
    await btnAfter.click()
    await page.waitForTimeout(3000)
    await page.waitForLoadState('networkidle').catch(() => {})
    console.log('URL after click:', page.url())
  } else {
    // Try the first test approach - fill all inputs
    console.log('\nTrying different approach...')
    const allInputs = await page.locator('input').all()
    for (let i = 0; i < allInputs.length; i++) {
      await allInputs[i].fill('')
    }
    await allInputs[0].fill('OpenCode')
    await allInputs[1].fill('OpenCode@111')

    // Try typing slowly
    await page.waitForTimeout(500)
    await allInputs[0].click()
    await allInputs[0].press('End')
    await page.keyboard.down('Shift')
    for (let i = 0; i < 20; i++) await allInputs[0].press('ArrowLeft')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Delete')
    await allInputs[0].type('OpenCode', { delay: 50 })

    await page.waitForTimeout(500)
    await allInputs[1].click()
    await allInputs[1].press('End')
    await page.keyboard.down('Shift')
    for (let i = 0; i < 20; i++) await allInputs[1].press('ArrowLeft')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Delete')
    await allInputs[1].type('OpenCode@111', { delay: 50 })

    await page.waitForTimeout(1000)
    const isDisabled3 = await btnAfter.isDisabled()
    console.log('Button disabled after typing:', isDisabled3)
    const btnClasses3 = await btnAfter.getAttribute('class')
    console.log('Classes:', btnClasses3?.substring(0, 150))
  }
}

// Screenshot
await page.screenshot({ path: 'playwright/qa-screenshots/debug-login.png', fullPage: false })
console.log('\nScreenshot saved')

await browser.close()
