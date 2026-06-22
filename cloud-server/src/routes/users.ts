import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'

import bcrypt from 'bcryptjs'

export const usersRouter = Router()

usersRouter.use(authMiddleware)

// 1. Get Assignable Users
usersRouter.get('/assignable', async (req: Request, res: Response) => {
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

// 11. Self get recovery info
usersRouter.get('/recovery-info',  async (req: Request, res: Response) => {
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
usersRouter.put('/recovery-info',  async (req: Request, res: Response) => {
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

usersRouter.use( (req, res, next) => {
  const { requirePermission } = require('../middleware/permission')
  requirePermission('manage_users')(req, res, next)
})

// 2. Get Active Staff
usersRouter.get('/active-staff',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/toggle-active',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/role',  async (req: Request, res: Response) => {
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
usersRouter.get('/:id/scope',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/scope',  async (req: Request, res: Response) => {
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
usersRouter.get('/:id/permission-overrides',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/permissions/:permissionKey',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/permissions/bulk',  async (req: Request, res: Response) => {
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
usersRouter.put('/:id/username',  async (req: Request, res: Response) => {
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

// 13. Admin updates user recovery info
usersRouter.put('/:id/recovery-info',  async (req: Request, res: Response) => {
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

// 14. Create user
usersRouter.post('/',  async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { username, full_name, role_key, password, employee_id } = req.body

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' })
      return
    }

    const exists = await query('SELECT id FROM users WHERE username = $1', [username])
    if (exists.rows.length > 0) {
      res.status(400).json({ error: 'UsernameAlreadyExists' })
      return
    }

    const userId = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)

    await query(
      `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, employee_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, NOW())`,
      [userId, companyId, username, full_name || username, passwordHash, role_key || 'secretary', employee_id || null]
    )

    res.status(201).json({ success: true, userId })
  } catch (err) {
    console.error('[Users] Create error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// 15. Delete user
usersRouter.delete('/:id',  async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.params.id

    const userCheck = await query(
      'SELECT username FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    )
    if (userCheck.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (userCheck.rows[0].username === 'admin') {
      res.status(403).json({ error: 'Cannot delete the main admin user' })
      return
    }

    await query('DELETE FROM user_case_access WHERE user_id = $1 AND company_id = $2', [userId, companyId])
    await query('DELETE FROM user_client_access WHERE user_id = $1 AND company_id = $2', [userId, companyId])
    await query('DELETE FROM user_permissions WHERE user_id = $1 AND company_id = $2', [userId, companyId])
    await query('DELETE FROM users WHERE id = $1 AND company_id = $2', [userId, companyId])

    res.json({ success: true })
  } catch (err) {
    console.error('[Users] Delete error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})
