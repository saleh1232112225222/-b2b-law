import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'

export const agenciesRouter = Router()

agenciesRouter.use(authMiddleware)

agenciesRouter.use((req, res, next) => {
  const { requirePermission } = require('../middleware/permission')
  requirePermission('view_clients')(req, res, next)
})

agenciesRouter.get('/by-client/:clientId', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT a.*, COALESCE(a.expiry_date::text, '') as expiry_date 
       FROM agencies a 
       WHERE a.client_id = $1 AND a.company_id = $2 
       ORDER BY a.date DESC`,
      [req.params.clientId, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Agencies] getByClientId error:', err)
    res.status(500).json({ error: 'فشل في جلب وكالات العميل' })
  }
})

agenciesRouter.get('/expiry-alerts', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const today = (req.query.today as string) || new Date().toISOString().split('T')[0]
    const days = parseInt((req.query.days as string) || '15', 10)

    const result = await query(
      `SELECT
         a.*,
         COALESCE(a.expiry_date::text, '') as expiry_date,
         c.name as client_name,
         (a.expiry_date::date - $2::date) as days_remaining
       FROM agencies a
       JOIN clients c ON a.client_id = c.id
       WHERE a.company_id = $1
         AND a.expiry_date IS NOT NULL
         AND a.expiry_date <= $2::date + ($3 || ' days')::interval
       ORDER BY a.expiry_date ASC`,
      [companyId, today, days]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Agencies] getExpiryAlerts error:', err)
    res.status(500).json({ error: 'فشل في جلب تنبيهات انتهاء الصلاحية' })
  }
})

agenciesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { page = '1', pageSize = '50', q } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
    const limit = parseInt(pageSize as string)

    let whereClause = `WHERE a.company_id = $1`
    const params: any[] = [companyId]
    let paramIndex = 2

    if (q) {
      params.push(`%${q}%`)
      whereClause += ` AND (a.agency_number LIKE $${paramIndex} OR c.name LIKE $${paramIndex})`
      paramIndex++
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM agencies a JOIN clients c ON a.client_id = c.id ${whereClause}`,
      params
    )
    const dataResult = await query(
      `SELECT a.*, c.name as client_name 
       FROM agencies a 
       JOIN clients c ON a.client_id = c.id 
       ${whereClause} 
       ORDER BY a.date DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      pageSize: limit
    })
  } catch (err) {
    console.error('[Agencies] List error:', err)
    res.status(500).json({ error: 'فشل في جلب قائمة الوكالات' })
  }
})

agenciesRouter.get('/all', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT a.*, c.name as client_name 
       FROM agencies a 
       JOIN clients c ON a.client_id = c.id 
       WHERE a.company_id = $1 
       ORDER BY a.date DESC`,
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Agencies] GetAll error:', err)
    res.status(500).json({ error: 'فشل في جلب الوكالات' })
  }
})

agenciesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT a.*, c.name as client_name 
       FROM agencies a 
       LEFT JOIN clients c ON a.client_id = c.id 
       WHERE a.id = $1 AND a.company_id = $2`,
      [req.params.id, companyId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'الوكالة غير موجودة' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('[Agencies] GetById error:', err)
    res.status(500).json({ error: 'فشل في جلب الوكالة' })
  }
})
