import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { getCompanyId, getUserId } from '../middleware/tenant'

interface EntityConfig {
  name: string
  table: string
  searchFields?: string[]
  idField?: string
  excludedRoutes?: string[]
}

const tableColumnsCache: Record<string, string[]> = {}

async function getTableColumns(table: string): Promise<string[]> {
  if (tableColumnsCache[table]) {
    return tableColumnsCache[table]
  }
  try {
    const res = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public'`,
      [table]
    )
    const columns = res.rows.map((r: any) => r.column_name.toLowerCase())
    tableColumnsCache[table] = columns
    return columns
  } catch (err) {
    console.error(`Failed to fetch columns for table ${table}:`, err)
    return []
  }
}

function parseTimeTo24h(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  let cleaned = timeStr.trim()
  if (!cleaned) return null

  const time24hRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
  if (time24hRegex.test(cleaned)) {
    return cleaned
  }

  const isPM = cleaned.includes('م') || cleaned.toLowerCase().includes('pm')
  const isAM = cleaned.includes('ص') || cleaned.toLowerCase().includes('am')

  cleaned = cleaned.replace(/[صم]/g, '').replace(/am|pm/gi, '').trim()

  const match = cleaned.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2]

  if (isPM) {
    if (hour !== 12) {
      hour += 12
    }
  } else if (isAM) {
    if (hour === 12) {
      hour = 0
    }
  }

  const hourStr = String(hour).padStart(2, '0')
  return `${hourStr}:${minute}`
}

export function createEntityRouter(config: EntityConfig): Router {
  const router = Router()
  const { table, searchFields, idField = 'id' } = config
  const allRoutes = ['getAll', 'list', 'count', 'getById', 'create', 'update', 'delete', 'search']
  const excluded = new Set(config.excludedRoutes || [])

  if (!excluded.has('list') || !excluded.has('getAll')) {
    router.get('/', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const { page = '1', pageSize = '50', q, ...filters } = req.query
        const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
        const limit = parseInt(pageSize as string)

        let whereClause = `WHERE company_id = $1`
        const params: any[] = [companyId]
        let paramIndex = 2

        if (q && searchFields && searchFields.length > 0) {
          const searchConditions = searchFields.map((f) => {
            params.push(`%${q}%`)
            return `LOWER("${f}") LIKE LOWER($${paramIndex++})`
          })
          whereClause += ` AND (${searchConditions.join(' OR ')})`
        }

        const columns = await getTableColumns(table)
        Object.entries(filters).forEach(([key, val]) => {
          const lowerKey = key.toLowerCase()
          if (val && key !== 'page' && key !== 'pageSize' && columns.includes(lowerKey)) {
            params.push(val)
            whereClause += ` AND "${lowerKey}" = $${paramIndex++}`
          }
        })

        const [countResult, dataResult] = await Promise.all([
          query(`SELECT COUNT(*) FROM ${table} ${whereClause}`, params),
          query(
            `SELECT * FROM ${table} ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
          )
        ])

        res.json({
          data: dataResult.rows,
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page as string),
          pageSize: limit
        })
      } catch (err) {
        console.error(`[${table}] List error:`, err)
        res.status(500).json({ error: 'فشل في جلب السجلات' })
      }
    })
  }

  if (!excluded.has('getAll')) {
    router.get('/all', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const result = await query(
          `SELECT * FROM ${table} WHERE company_id = $1 ORDER BY created_at DESC`,
          [companyId]
        )
        res.json(result.rows)
      } catch (err) {
        console.error(`[${table}] GetAll error:`, err)
        res.status(500).json({ error: 'فشل في جلب السجلات' })
      }
    })
  }

  if (!excluded.has('count')) {
    router.get('/count', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const { q, ...filters } = req.query
        const conditions: string[] = ['company_id = $1']
        const params: any[] = [companyId]

        if (q && searchFields) {
          const searchConds = searchFields.map((f) => {
            params.push(`%${q}%`)
            return `LOWER("${f}") LIKE LOWER($${params.length})`
          })
          conditions.push(`(${searchConds.join(' OR ')})`)
        }

        const columns = await getTableColumns(table)
        Object.entries(filters).forEach(([key, val]) => {
          const lowerKey = key.toLowerCase()
          if (val && key !== 'page' && key !== 'pageSize' && columns.includes(lowerKey)) {
            params.push(val)
            conditions.push(`"${lowerKey}" = $${params.length}`)
          }
        })

        const result = await query(
          `SELECT COUNT(*) FROM ${table} WHERE ${conditions.join(' AND ')}`,
          params
        )
        res.json({ count: parseInt(result.rows[0].count) })
      } catch (err) {
        console.error(`[${table}] Count error:`, err)
        res.status(500).json({ error: 'فشل في العد' })
      }
    })
  }

  if (!excluded.has('search')) {
    router.get('/search', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const q = req.query.q as string
        if (!q || !searchFields || searchFields.length === 0) {
          res.status(400).json({ error: 'استعلام البحث مطلوب' })
          return
        }

        const conditions = searchFields.map((f) => {
          return `LOWER(${f}) LIKE LOWER($1)`
        })
        const result = await query(
          `SELECT * FROM ${table} WHERE company_id = $2 AND (${conditions.join(' OR ')}) LIMIT 20`,
          [`%${q}%`, companyId]
        )
        res.json(result.rows)
      } catch (err) {
        console.error(`[${table}] Search error:`, err)
        res.status(500).json({ error: 'فشل البحث' })
      }
    })
  }

  if (!excluded.has('getById')) {
    router.get('/:id', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const result = await query(
          `SELECT * FROM ${table} WHERE ${idField} = $1 AND company_id = $2`,
          [req.params.id, companyId]
        )
        if (result.rows.length === 0) {
          res.status(404).json({ error: 'السجل غير موجود' })
          return
        }
        res.json(result.rows[0])
      } catch (err) {
        console.error(`[${table}] GetById error:`, err)
        res.status(500).json({ error: 'فشل في جلب السجل' })
      }
    })
  }

  if (!excluded.has('create')) {
    router.post('/', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const body = { ...req.body, company_id: companyId }
        delete body.id

        if (!body.created_by) body.created_by = getUserId(req)
        body.created_at = new Date().toISOString()
        body.updated_at = body.created_at

        const { v4: uuidv4 } = require('uuid')
        const id = uuidv4()
        body.id = id

        // Convert empty strings to null for PostgreSQL compatibility
        for (const key of Object.keys(body)) {
          if (body[key] === '') {
            body[key] = null
          } else if (key.toLowerCase() === 'time' && typeof body[key] === 'string') {
            body[key] = parseTimeTo24h(body[key])
          }
        }

        const validColumns = await getTableColumns(table)
        if (validColumns && validColumns.length > 0) {
          for (const key of Object.keys(body)) {
            if (!validColumns.includes(key.toLowerCase())) {
              delete body[key]
            }
          }
        }

        const keys = Object.keys(body)
        const values = Object.values(body)
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
        const columns = keys.join(', ')

        await query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values)
        res.status(201).json(body)
      } catch (err) {
        console.error(`[${table}] Create error:`, err)
        res.status(500).json({ error: 'فشل في إنشاء السجل' })
      }
    })
  }

  if (!excluded.has('update')) {
    router.put('/:id', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const body = { ...req.body }
        delete body.id
        delete body.company_id

        body.updated_at = new Date().toISOString()
        if (!body.updated_by) body.updated_by = getUserId(req)

        // Convert empty strings to null for PostgreSQL compatibility
        for (const key of Object.keys(body)) {
          if (body[key] === '') {
            body[key] = null
          } else if (key.toLowerCase() === 'time' && typeof body[key] === 'string') {
            body[key] = parseTimeTo24h(body[key])
          }
        }

        const validColumns = await getTableColumns(table)
        if (validColumns && validColumns.length > 0) {
          for (const key of Object.keys(body)) {
            if (!validColumns.includes(key.toLowerCase())) {
              delete body[key]
            }
          }
        }

        const keys = Object.keys(body)
        const values = Object.values(body)
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')

        const result = await query(
          `UPDATE ${table} SET ${setClause} WHERE ${idField} = $${keys.length + 1} AND company_id = $${keys.length + 2}`,
          [...values, req.params.id, companyId]
        )
        if (result.rowCount === 0) {
          res.status(404).json({ error: 'السجل غير موجود' })
          return
        }
        res.json({ success: true })
      } catch (err) {
        console.error(`[${table}] Update error:`, err)
        res.status(500).json({ error: 'فشل في تحديث السجل' })
      }
    })
  }

  if (!excluded.has('delete')) {
    router.delete('/:id', async (req: Request, res: Response) => {
      try {
        const companyId = getCompanyId(req)
        const result = await query(
          `DELETE FROM ${table} WHERE ${idField} = $1 AND company_id = $2`,
          [req.params.id, companyId]
        )
        if (result.rowCount === 0) {
          res.status(404).json({ error: 'السجل غير موجود' })
          return
        }
        res.json({ success: true })
      } catch (err) {
        console.error(`[${table}] Delete error:`, err)
        res.status(500).json({ error: 'فشل في حذف السجل' })
      }
    })
  }

  return router
}
