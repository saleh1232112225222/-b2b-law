import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId, getUserId } from '../middleware/tenant'
import { requirePermission } from '../middleware/permission'
import * as fs from 'fs'
import * as path from 'path'

export const documentsRouter = Router()

documentsRouter.use(authMiddleware)

// 1. GET /api/documents/by-task/:taskId
documentsRouter.get(
  '/by-task/:taskId',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { taskId } = req.params
      const result = await query(
        `SELECT * FROM documents_v2 
         WHERE task_id = $1 AND company_id = $2 AND (is_archived IS NULL OR is_archived = false)
         ORDER BY created_at DESC`,
        [taskId, companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[DOCUMENTS] byTask error:', err)
      res.status(500).json({ error: 'فشل جلب مستندات المهمة' })
    }
  }
)

// 2. GET /api/documents/by-case/:caseId
documentsRouter.get(
  '/by-case/:caseId',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const result = await query(
        `SELECT * FROM documents_v2 
         WHERE case_id = $1 AND company_id = $2 AND (is_archived IS NULL OR is_archived = false)
         ORDER BY created_at DESC`,
        [caseId, companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[DOCUMENTS] byCase error:', err)
      res.status(500).json({ error: 'فشل جلب مستندات القضية' })
    }
  }
)

// 3. GET /api/documents/by-session/:sessionId
documentsRouter.get(
  '/by-session/:sessionId',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { sessionId } = req.params
      const result = await query(
        `SELECT * FROM documents_v2 
         WHERE session_id = $1 AND company_id = $2 AND (is_archived IS NULL OR is_archived = false)
         ORDER BY created_at DESC`,
        [sessionId, companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[DOCUMENTS] bySession error:', err)
      res.status(500).json({ error: 'فشل جلب مستندات الجلسة' })
    }
  }
)

// 4. POST /api/documents/upload
documentsRouter.post(
  '/upload',
  requirePermission('create_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = getUserId(req)
      const {
        name,
        fileType,
        fileSize,
        fileData,
        filePath,
        linkType = 'none',
        parentId,
        linkedTitle
      } = req.body

      if (!name) {
        res.status(400).json({ error: 'اسم الملف مطلوب' })
        return
      }

      let storedPath = filePath || ''

      // If base64 data provided, save to disk
      if (fileData && typeof fileData === 'string') {
        const base64Data = fileData.replace(/^data:.*?;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', String(companyId))
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        const safeFileName = `${Date.now()}_${path.basename(name)}`
        const fullPath = path.join(uploadsDir, safeFileName)
        fs.writeFileSync(fullPath, buffer)
        storedPath = path.join('uploads', 'documents', String(companyId), safeFileName).replace(/\\/g, '/')
      }

      const normLinkType = String(linkType || 'none').toLowerCase()
      const taskId = normLinkType === 'task' && parentId ? parentId : null
      const caseId = normLinkType === 'case' && parentId ? parentId : null
      const sessionId = normLinkType === 'session' && parentId ? parentId : null

      const result = await query(
        `INSERT INTO documents_v2 (
          company_id, name, file_path, file_type, file_size, 
          link_type, linked_title, task_id, case_id, session_id,
          created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, NOW()
        ) RETURNING *`,
        [
          companyId,
          name,
          storedPath || name,
          fileType || (name.includes('.') ? '.' + name.split('.').pop() : ''),
          fileSize || 0,
          normLinkType,
          linkedTitle || null,
          taskId,
          caseId,
          sessionId,
          userId || null
        ]
      )

      res.status(201).json(result.rows[0])
    } catch (err) {
      console.error('[DOCUMENTS] upload error:', err)
      res.status(500).json({ error: 'فشل رفع وحفظ المستند' })
    }
  }
)

// 5. GET /api/documents (List / Search)
documentsRouter.get(
  '/',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { page = '1', pageSize = '50', q, link_type, case_id, task_id, session_id } = req.query
      const offset = (parseInt(page as string, 10) - 1) * parseInt(pageSize as string, 10)
      const limit = parseInt(pageSize as string, 10)

      let whereClause = `WHERE company_id = $1 AND (is_archived IS NULL OR is_archived = false)`
      const params: any[] = [companyId]
      let paramIndex = 2

      if (q) {
        params.push(`%${q}%`)
        whereClause += ` AND (LOWER(name) LIKE LOWER($${paramIndex++}))`
      }
      if (link_type) {
        params.push(link_type)
        whereClause += ` AND link_type = $${paramIndex++}`
      }
      if (case_id) {
        params.push(case_id)
        whereClause += ` AND case_id = $${paramIndex++}`
      }
      if (task_id) {
        params.push(task_id)
        whereClause += ` AND task_id = $${paramIndex++}`
      }
      if (session_id) {
        params.push(session_id)
        whereClause += ` AND session_id = $${paramIndex++}`
      }

      const countRes = await query(`SELECT COUNT(*) as total FROM documents_v2 ${whereClause}`, params)
      const total = parseInt(countRes.rows[0]?.total || '0', 10)

      params.push(limit, offset)
      const dataRes = await query(
        `SELECT * FROM documents_v2 ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      )

      res.json({
        data: dataRes.rows,
        total,
        page: parseInt(page as string, 10),
        pageSize: limit
      })
    } catch (err) {
      console.error('[DOCUMENTS] list error:', err)
      res.status(500).json({ error: 'فشل جلب قائمة المستندات' })
    }
  }
)

// 6. GET /api/documents/:id
documentsRouter.get(
  '/:id',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'SELECT * FROM documents_v2 WHERE id = $1 AND company_id = $2',
        [req.params.id, companyId]
      )
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'المستند غير موجود' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[DOCUMENTS] getById error:', err)
      res.status(500).json({ error: 'فشل جلب المستند' })
    }
  }
)

// 7. DELETE /api/documents/:id
documentsRouter.delete(
  '/:id',
  requirePermission('create_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'DELETE FROM documents_v2 WHERE id = $1 AND company_id = $2 RETURNING id, file_path',
        [req.params.id, companyId]
      )
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'المستند غير موجود' })
        return
      }

      // Try deleting local file if exists
      const deletedDoc = result.rows[0]
      if (deletedDoc?.file_path && fs.existsSync(deletedDoc.file_path)) {
        try {
          fs.unlinkSync(deletedDoc.file_path)
        } catch (e) {
          console.error('[DOCUMENTS] failed to delete physical file:', e)
        }
      }

      res.json({ success: true })
    } catch (err) {
      console.error('[DOCUMENTS] delete error:', err)
      res.status(500).json({ error: 'فشل حذف المستند' })
    }
  }
)
