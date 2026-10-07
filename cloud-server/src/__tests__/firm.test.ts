import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockQuery = vi.fn()
vi.mock('../db/connection', () => ({
  query: (...args: any[]) => mockQuery(...args)
}))

vi.mock('../middleware/tenant', () => ({
  getCompanyId: () => '11111111-1111-1111-1111-111111111111'
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.auth = { userId: 'user-1', role: 'admin' }
    next()
  }
}))

import { firmRouter } from '../routes/firm'

// Helper to simulate router handler execution
function mockReqRes(method: string, path: string, body?: any) {
  const req: any = {
    method,
    url: path,
    path,
    body: body || {},
    headers: {}
  }
  let statusCode = 200
  let responseData: any = null

  const res: any = {
    status: (code: number) => {
      statusCode = code
      return res
    },
    json: (data: any) => {
      responseData = data
      return res
    }
  }

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData
  }
}

describe('Firm Router (/api/firm)', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('GET / maps firm profile data and fallback company values', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ name: 'الشركة المالكة', email: 'owner@test.com', phone: '0500000000' }]
    })
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'name', value: 'مكتب المحامي صالح محمد المحمدي' },
        { key: 'license_number', value: '37496' },
        { key: 'tax_number', value: '15' },
        { key: 'address', value: 'الرياض' },
        { key: 'phone', value: '0567905696' },
        { key: 'email', value: 'SALEH137@HOTMAIL.COM' },
        { key: 'website', value: 'WWW.SALEHLAW.COM' },
        { key: 'logo_path', value: 'branding/logo.png' }
      ]
    })

    const { req, res, getStatus, getData } = mockReqRes('GET', '/')
    // Find the GET / handler on firmRouter
    const route = firmRouter.stack.find((layer: any) => layer.route?.path === '/' && layer.route?.methods?.get)
    expect(route).toBeDefined()
    await route.route.stack[0].handle(req, res)

    expect(getStatus()).toBe(200)
    const data = getData()
    expect(data.name).toBe('مكتب المحامي صالح محمد المحمدي')
    expect(data.license_number).toBe('37496')
    expect(data.tax_number).toBe('15')
    expect(data.address).toBe('الرياض')
    expect(data.phone).toBe('0567905696')
    expect(data.email).toBe('SALEH137@HOTMAIL.COM')
    expect(data.website).toBe('WWW.SALEHLAW.COM')
  })

  it('PUT / upserts firm entries and syncs company name', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 })

    const { req, res, getStatus, getData } = mockReqRes('PUT', '/', {
      name: 'مكتب المحامي صالح المحدث',
      license_number: '37496',
      phone: '0567905696'
    })

    const route = firmRouter.stack.find((layer: any) => layer.route?.path === '/' && layer.route?.methods?.put)
    expect(route).toBeDefined()
    await route.route.stack[0].handle(req, res)

    expect(getStatus()).toBe(200)
    expect(getData().success).toBe(true)

    // Verify company name was updated in companies table
    const companyUpdate = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE companies SET name')
    )
    expect(companyUpdate).toBeDefined()
    expect(companyUpdate[1][0]).toBe('مكتب المحامي صالح المحدث')
  })

  it('POST /resolve-logo resolves URLs cleanly', async () => {
    const { req, res, getData } = mockReqRes('POST', '/resolve-logo', {
      logoPath: 'https://cdn.example.com/logo.png'
    })

    const route = firmRouter.stack.find(
      (layer: any) => layer.route?.path === '/resolve-logo' && layer.route?.methods?.post
    )
    expect(route).toBeDefined()
    await route.route.stack[0].handle(req, res)

    expect(getData().src).toBe('https://cdn.example.com/logo.png')
  })
})
