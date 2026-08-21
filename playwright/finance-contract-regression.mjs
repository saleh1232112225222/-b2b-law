import { strict as assert } from 'node:assert'
import { chromium } from '@playwright/test'

const username = process.env.FINANCE_AUDIT_USER
const password = process.env.FINANCE_AUDIT_PASSWORD
const baseUrl = process.env.FINANCE_AUDIT_URL || 'http://127.0.0.1:5173'

if (!username || !password) {
  throw new Error('FINANCE_AUDIT_USER and FINANCE_AUDIT_PASSWORD are required')
}

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${baseUrl}/#/login`, { waitUntil: 'networkidle' })
  const inputs = page.locator('input')
  await inputs.nth(0).fill(username)
  await inputs.nth(1).fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click()
  await page.waitForTimeout(1200)

  const auth = await page.evaluate(() => ({
    token: localStorage.getItem('b2b_cloud_token'),
    mock: localStorage.getItem('mock_active') === 'true'
  }))
  assert.ok(auth.token, 'real cloud token must be established')
  assert.equal(auth.mock, false, 'finance regression must never run in mock mode')

  await page.goto(`${baseUrl}/#/finance`, { waitUntil: 'networkidle' })
  const apiResult = await page.evaluate(async () => {
    const token = localStorage.getItem('b2b_cloud_token')
    const csrf = localStorage.getItem('csrfToken')
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {})
    }
    const request = async (path, options = {}) => {
      const response = await fetch(`/api${path}`, { headers, ...options })
      const body = await response.json().catch(() => null)
      return { status: response.status, body }
    }
    const engagementsResponse = await request('/legal-services/engagements?page=1&pageSize=1000')
    const engagements = Array.isArray(engagementsResponse.body)
      ? engagementsResponse.body
      : engagementsResponse.body?.data || []
    const clientId = engagements.find((item) => item.client_id)?.client_id
    const financesResponse = await request('/finances/all')
    const finances = Array.isArray(financesResponse.body) ? financesResponse.body : []
    const missingFinanceLinks = engagements
      .filter((item) => Number(item.financial_compensation || 0) > 0)
      .filter((item) => !finances.some((finance) => finance.legal_engagement_id === item.id))
    const profiles = []
    for (const id of [...new Set(engagements.map((item) => item.client_id).filter(Boolean))]) {
      profiles.push(await request(`/office-accounts/clients/${id}/full-profile`))
    }
    let creditNotesAdapterOk = false
    try {
      const notes = await window.api.creditNotes.getAll()
      creditNotesAdapterOk = Array.isArray(notes)
    } catch {
      creditNotesAdapterOk = false
    }
    const openReceivablesResult = await request('/receivables/open')
    const officeReport = await request('/office-accounts/report')
    const financeStats = await request('/finances/stats')
    const expectedStats = finances.reduce(
      (totals, finance) => {
        if (finance.status === 'cancelled') return totals
        if (finance.type === 'expense') totals.expense += Number(finance.total ?? finance.amount ?? 0)
        if (finance.type === 'income') totals.income += Number(finance.total ?? finance.amount ?? 0)
        if (finance.type === 'receivable') totals.income += Number(finance.paid_amount || 0)
        return totals
      },
      { income: 0, expense: 0 }
    )
    return {
      openReceivables: openReceivablesResult.status,
      receivablesByClient: clientId
        ? (await request(`/receivables/by-client/${clientId}`)).status
        : 200,
      profiles,
      creditNotesAdapterOk,
      missingFinanceLinks,
      officeReport,
      financeStats,
      expectedStats
    }
  })

  assert.equal(apiResult.openReceivables, 200, 'GET /receivables/open must succeed')
  assert.equal(apiResult.receivablesByClient, 200, 'GET /receivables/by-client/:id must succeed')
  assert.ok(
    apiResult.profiles.every(({ status }) => status === 200),
    `full financial profiles must succeed: ${JSON.stringify(apiResult.profiles)}`
  )
  assert.equal(apiResult.creditNotesAdapterOk, true, 'credit notes adapter must use the server route')
  assert.deepEqual(apiResult.missingFinanceLinks, [], 'paid legal services must be linked to finance ledger')
  assert.equal(apiResult.officeReport.status, 200, 'office accounts report must succeed')
  assert.equal(apiResult.financeStats.status, 200, 'finance stats must succeed')
  assert.equal(Number(apiResult.financeStats.body.income), apiResult.expectedStats.income)
  assert.equal(Number(apiResult.financeStats.body.expense), apiResult.expectedStats.expense)
  const reportSummary = apiResult.officeReport.body?.summary || {}
  assert.ok(
    Math.abs(
      Number(reportSummary.total_revenue || 0) - Number(reportSummary.total_collected || 0) -
        Number(reportSummary.total_outstanding || 0)
    ) < 0.02,
    `office report totals must reconcile: ${JSON.stringify(reportSummary)}`
  )

  await page.getByRole('tab', { name: 'الفواتير', exact: true }).click()
  const invoiceRows = page.locator('.v-window-item--active tbody tr')
  if ((await invoiceRows.count()) > 0) {
    const cells = await invoiceRows.first().locator('td').allTextContents()
    const invoiceData = await page.evaluate(() => window.api.invoices.getAll())
    const firstTotal = Number(invoiceData[0]?.total ?? invoiceData[0]?.total_amount ?? 0)
    assert.equal(
      Number(invoiceData[0]?.total_amount),
      firstTotal,
      `invoice adapter must expose canonical total: ${JSON.stringify(invoiceData[0])}`
    )
    if (firstTotal > 0) {
      assert.notEqual(cells[3]?.trim(), '٠ ريال', 'a non-zero invoice must not render as zero')
    }
  }

  console.log('finance-contract-regression: PASS')
} finally {
  await browser.close()
}
