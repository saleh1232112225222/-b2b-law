import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'

import bcrypt from 'bcryptjs'

export const usersRouter = Router()

// 1. Get Assignable Users
usersRouter.get('/assignable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT id, username, full_name, role_key 
       FROM users 
       WHERE company_id = $1 AND is_active = TRUE AND role_key IN ('admin', 'licensed_lawyer')
       ORDER BY role_key ASC, COALESCE(full_name, username) ASC`,
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Users] Get assignable error:', err)
    res.status(500).json({ error: 'Failed to get assignable users' })
  }
})

usersRouter.use((req, res, next) => {
  const { requirePermission } = require('../middleware/permission')
  requirePermission('manage_users')(req, res, next)
})

// 2. Get Active Staff
usersRouter.get('/active-staff', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT id, username, full_name, role_key 
       FROM users 
       WHERE company_id = $1 AND is_active = TRUE AND role_key IN ('admin', 'licensed_lawyer', 'trainee_lawyer', 'secretary')
       ORDER BY role_key ASC, COALESCE(full_name, username) ASC`,
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Users] Get active staff error:', err)
    res.status(500).json({ error: 'Failed to get active staff' })
  }
})

// 3. Toggle Active
usersRouter.put('/:id/toggle-active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { isActive } = req.body
    
    await query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
      [isActive, userId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Toggle active error:', err)
    res.status(500).json({ error: 'Failed to toggle user status' })
  }
})

// 4. Set Role
usersRouter.put('/:id/role', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { roleKey } = req.body
    
    await query(
      `UPDATE users SET role_key = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
      [roleKey, userId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Set role error:', err)
    res.status(500).json({ error: 'Failed to set user role' })
  }
})

// 5. Get Scope
usersRouter.get('/:id/scope', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    
    const casesRes = await query(
      `SELECT case_id, access_level FROM user_case_access WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    )
    const clientsRes = await query(
      `SELECT client_id, access_level FROM user_client_access WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    )
    
    res.json({
      caseScopes: casesRes.rows,
      clientScopes: clientsRes.rows
    })
  } catch (err) {
    console.error('[Users] Get scope error:', err)
    res.status(500).json({ error: 'Failed to get user scope' })
  }
})

// 6. Set Scope
usersRouter.put('/:id/scope', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { caseScopes = [], clientScopes = [] } = req.body
    
    await query('DELETE FROM user_case_access WHERE user_id = $1 AND company_id = $2', [userId, companyId])
    for (const sc of caseScopes) {
      await query(
        `INSERT INTO user_case_access (company_id, user_id, case_id, access_level) VALUES ($1, $2, $3, $4)`,
        [companyId, userId, sc.case_id, sc.access_level]
      )
    }
    
    await query('DELETE FROM user_client_access WHERE user_id = $1 AND company_id = $2', [userId, companyId])
    for (const sc of clientScopes) {
      await query(
        `INSERT INTO user_client_access (company_id, user_id, client_id, access_level) VALUES ($1, $2, $3, $4)`,
        [companyId, userId, sc.client_id, sc.access_level]
      )
    }
    
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Set scope error:', err)
    res.status(500).json({ error: 'Failed to set user scope' })
  }
})

// 7. Get Permission Overrides
usersRouter.get('/:id/permission-overrides', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    
    const result = await query(
      `SELECT permission_key, is_allowed FROM user_permissions WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Users] Get overrides error:', err)
    res.status(500).json({ error: 'Failed to get permission overrides' })
  }
})

// 8. Set Permission Override
usersRouter.put('/:id/permissions/:permissionKey', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { permissionKey } = req.params
    const { isAllowed } = req.body
    
    await query(
      `INSERT INTO user_permissions (company_id, user_id, permission_key, is_allowed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, user_id, permission_key)
       DO UPDATE SET is_allowed = $4`,
      [companyId, userId, permissionKey, isAllowed]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Set override error:', err)
    res.status(500).json({ error: 'Failed to set permission override' })
  }
})

// 9. Set Bulk Overrides
usersRouter.put('/:id/permissions/bulk', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { isAllowed, permissionKeys = [] } = req.body
    
    for (const key of permissionKeys) {
      await query(
        `INSERT INTO user_permissions (company_id, user_id, permission_key, is_allowed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, user_id, permission_key)
         DO UPDATE SET is_allowed = $4`,
        [companyId, userId, key, isAllowed]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Set bulk overrides error:', err)
    res.status(500).json({ error: 'Failed to set bulk overrides' })
  }
})

// 10. Update Username
usersRouter.put('/:id/username', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { newUsername } = req.body
    
    // Check if newUsername is already taken
    const exists = await query(`SELECT id FROM users WHERE username = $1`, [newUsername])
    if (exists.rows.length > 0) {
      res.status(400).json({ error: 'UsernameAlreadyExists' })
      return
    }
    
    await query(
      `UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
      [newUsername, userId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Update username error:', err)
    res.status(500).json({ error: 'Failed to update username' })
  }
})

// 11. Self get recovery info
usersRouter.get('/recovery-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    
    const result = await query(
      `SELECT recovery_email, security_question FROM users WHERE id = $1 AND company_id = $2`,
      [userId, companyId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('[Users] Get self recovery info error:', err)
    res.status(500).json({ error: 'Failed to get recovery info' })
  }
})

// 12. Self update recovery info
usersRouter.put('/recovery-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const { email, question, answer } = req.body
    
    let answerHash: string | null = null
    if (answer) {
      answerHash = await bcrypt.hash(answer, 12)
    }
    
    await query(
      `UPDATE users 
       SET recovery_email = $1, security_question = $2, security_answer_hash = COALESCE($3, security_answer_hash), updated_at = NOW() 
       WHERE id = $4 AND company_id = $5`,
      [email, question, answerHash, userId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Update self recovery info error:', err)
    res.status(500).json({ error: 'Failed to update recovery info' })
  }
})

// 13. Admin updates user recovery info
usersRouter.put('/:id/recovery-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id
    const { email, question, answer } = req.body
    
    let answerHash: string | null = null
    if (answer) {
      answerHash = await bcrypt.hash(answer, 12)
    }
    
    await query(
      `UPDATE users 
       SET recovery_email = $1, security_question = $2, security_answer_hash = COALESCE($3, security_answer_hash), updated_at = NOW() 
       WHERE id = $4 AND company_id = $5`,
      [email, question, answerHash, userId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Admin update recovery info error:', err)
    res.status(500).json({ error: 'Failed to update user recovery info' })
  }
})
