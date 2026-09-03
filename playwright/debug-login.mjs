import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 412, height: 915 } })

await page.goto('https://b2b-law.netlify.app/', { waitUntil: 'networkidle', timeout: 30000 })
console.log('=== PAGE HTML (first 2000 chars) ===')
const html = await page.content()
console.log(html.substring(0, 2000))

// Find all buttons
const buttons = await page.locator('button').all()
console.log('\n=== BUTTONS ===')
for (const btn of buttons) {
  const text = await btn.textContent()
  const cls = await btn.getAttribute('class')
  const type = await btn.getAttribute('type')
  console.log(
    `Button: text="${text.trim().substring(0, 50)}" class="${cls?.substring(0, 60)}" type="${type}"`
  )
}

// Find all inputs
const inputs = await page.locator('input').all()
console.log('\n=== INPUTS ===')
for (const inp of inputs) {
  const type = await inp.getAttribute('type')
  const name = await inp.getAttribute('name')
  const placeholder = await inp.getAttribute('placeholder')
  const autocomplete = await inp.getAttribute('autocomplete')
  const id = await inp.getAttribute('id')
  console.log(
    `Input: type="${type}" name="${name}" placeholder="${placeholder}" autocomplete="${autocomplete}" id="${id}"`
  )
}

// Check if there's a form
const forms = await page.locator('form').count()
console.log(`\nForms: ${forms}`)

await browser.close()
