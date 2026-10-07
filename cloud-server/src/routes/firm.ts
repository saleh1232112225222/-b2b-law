import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { getCompanyId } from '../middleware/tenant'
import { authMiddleware } from '../middleware/auth'

export const firmRouter = Router()

// All routes require authentication
firmRouter.use(authMiddleware)

// GET /api/firm - Fetch firm profile data
firmRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) {
      return res.status(401).json({ error: 'المصادقة مطلوبة' })
    }

    // Get company base info as fallback
    const compRes = await query('SELECT name, email, phone FROM companies WHERE id = $1', [companyId])
    const company = compRes.rows[0] || {}

    // Get all firm_data entries
    const result = await query('SELECT key, value FROM firm_data WHERE company_id = $1', [companyId])
    const rawData: Record<string, string> = {}
    for (const row of result.rows) {
      rawData[row.key] = row.value
    }

    // Map keys to standard Firm format
    const firm = {
      name: rawData.name || rawData.firm_name || rawData.officeName || company.name || '',
      license_number: rawData.license_number || rawData.licenseNumber || '',
      tax_number: rawData.tax_number || rawData.taxNumber || rawData.vatNumber || '',
      address: rawData.address || rawData.firm_address || rawData.firmAddress || '',
      phone: rawData.phone || rawData.firm_phone || rawData.firmPhone || company.phone || '',
      email: rawData.email || rawData.firm_email || rawData.firmEmail || company.email || '',
      website: rawData.website || '',
      logo_path: rawData.logo_path || rawData.logo || '',
      logo_src: rawData.logo_src || '',
      twitter: rawData.twitter || '',
      linkedin: rawData.linkedin || '',
      instagram: rawData.instagram || '',
      facebook: rawData.facebook || ''
    }

    return res.json(firm)
  } catch (err: any) {
    console.error('[Firm] Get error:', err)
    return res.status(500).json({ error: 'فشل في جلب بيانات المنشأة' })
  }
})

// PUT /api/firm - Update firm profile data
firmRouter.put('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    if (!companyId) {
      return res.status(401).json({ error: 'المصادقة مطلوبة' })
    }

    const body = req.body || {}
    for (const [key, value] of Object.entries(body)) {
      if (!key || typeof key !== 'string') continue
      if (key === 'logo_src') continue // Don't persist transient display url

      const val = typeof value === 'string' ? value : value === null || value === undefined ? '' : JSON.stringify(value)

      // Upsert into firm_data
      await query(
        `INSERT INTO firm_data (id, company_id, key, value, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
         ON CONFLICT (company_id, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [companyId, key, val]
      )
    }

    // Keep company name in sync if firm name updated
    if (body.name && typeof body.name === 'string' && body.name.trim()) {
      await query('UPDATE companies SET name = $1, updated_at = NOW() WHERE id = $2', [
        body.name.trim(),
        companyId
      ])
    }

    return res.json({ success: true })
  } catch (err: any) {
    console.error('[Firm] Update error:', err)
    return res.status(500).json({ error: err?.message || 'فشل في تحديث بيانات المنشأة' })
  }
})

// POST /api/firm/resolve-logo
firmRouter.post('/resolve-logo', async (req: Request, res: Response) => {
  try {
    const { logoPath } = req.body || {}
    const raw = String(logoPath || '').trim()
    if (!raw) return res.json({ src: '' })
    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
      return res.json({ src: raw })
    }
    return res.json({ src: '' })
  } catch (err: any) {
    return res.json({ src: '' })
  }
})
