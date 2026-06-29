import { Request, Response, NextFunction } from 'express'
import { query } from '../db/connection'

export const DEFAULT_PERMISSIONS = [
  { key: 'view_cases', name: 'عرض القضايا', module: 'cases' },
  { key: 'create_cases', name: 'إضافة القضايا', module: 'cases' },
  { key: 'edit_cases', name: 'تعديل القضايا', module: 'cases' },
  { key: 'view_sessions', name: 'عرض الجلسات', module: 'sessions' },
  { key: 'create_sessions', name: 'إضافة الجلسات', module: 'sessions' },
  { key: 'edit_sessions', name: 'تعديل الجلسات', module: 'sessions' },
  { key: 'view_tasks', name: 'عرض المهام', module: 'tasks' },
  { key: 'create_tasks', name: 'إضافة المهام', module: 'tasks' },
  { key: 'edit_tasks', name: 'تعديل المهام', module: 'tasks' },
  { key: 'cancel_tasks', name: 'إلغاء المهام', module: 'tasks' },
  { key: 'close_tasks', name: 'إغلاق المهام', module: 'tasks' },
  { key: 'reopen_tasks', name: 'إعادة فتح المهام', module: 'tasks' },
  { key: 'view_task_audit', name: 'عرض سجل تدقيق المهام', module: 'tasks' },
  { key: 'view_clients', name: 'عرض العملاء', module: 'clients' },
  { key: 'create_clients', name: 'إضافة العملاء', module: 'clients' },
  { key: 'edit_clients', name: 'تعديل العملاء', module: 'clients' },
  { key: 'view_defendants', name: 'عرض الخصوم', module: 'defendants' },
  { key: 'create_defendants', name: 'إضافة الخصوم', module: 'defendants' },
  { key: 'edit_defendants', name: 'تعديل الخصوم', module: 'defendants' },
  { key: 'view_documents', name: 'عرض المستندات', module: 'documents' },
  { key: 'create_documents', name: 'إضافة المستندات', module: 'documents' },
  { key: 'view_finances', name: 'عرض المالية', module: 'finances' },
  { key: 'create_finances', name: 'إضافة مالية', module: 'finances' },
  { key: 'view_contracts', name: 'عرض العقود', module: 'contracts' },
  { key: 'create_contracts', name: 'إضافة عقود', module: 'contracts' },
  { key: 'view_enforcement', name: 'عرض طلبات التنفيذ', module: 'enforcement' },
  { key: 'create_enforcement', name: 'إضافة طلبات التنفيذ', module: 'enforcement' },
  { key: 'view_employees', name: 'عرض الموظفين', module: 'employees' },
  { key: 'manage_settings', name: 'إدارة الإعدادات', module: 'settings' },
  { key: 'view_activity_logs', name: 'عرض سجل النشاطات', module: 'settings' },
  { key: 'manage_users', name: 'إدارة المستخدمين', module: 'settings' },
  { key: 'export_reports', name: 'تصدير التقارير', module: 'reports' },
  { key: 'view_files', name: 'عرض خزانة الملفات', module: 'vault' },
  { key: 'view_legal_services', name: 'عرض الخدمات القانونية', module: 'legal_services' },
  { key: 'create_legal_services', name: 'إضافة خدمة قانونية', module: 'legal_services' },
  { key: 'edit_legal_services', name: 'تعديل خدمة قانونية', module: 'legal_services' },
  { key: 'delete_legal_services', name: 'حذف خدمة قانونية', module: 'legal_services' },
  { key: 'manage_legal_services', name: 'إدارة قائمة الخدمات', module: 'legal_services' },
  { key: 'create_legal_engagements', name: 'إضافة التعاقدات القانونية', module: 'legal_services' }
]

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  licensed_lawyer: [
    'view_cases',
    'create_cases',
    'edit_cases',
    'view_sessions',
    'create_sessions',
    'edit_sessions',
    'view_tasks',
    'create_tasks',
    'edit_tasks',
    'cancel_tasks',
    'close_tasks',
    'reopen_tasks',
    'view_clients',
    'create_clients',
    'edit_clients',
    'view_defendants',
    'create_defendants',
    'edit_defendants',
    'view_documents',
    'create_documents',
    'view_contracts',
    'create_contracts',
    'view_enforcement',
    'create_enforcement',
    'export_reports',
    'view_files',
    'view_legal_services',
    'create_legal_services',
    'edit_legal_services',
    'delete_legal_services',
    'manage_legal_services',
    'create_legal_engagements'
  ],
  trainee_lawyer: [
    'view_cases',
    'view_sessions',
    'view_tasks',
    'create_tasks',
    'edit_tasks',
    'view_clients',
    'view_defendants',
    'view_documents',
    'create_documents',
    'view_files',
    'view_legal_services'
  ],
  secretary: [
    'view_cases',
    'view_sessions',
    'create_sessions',
    'edit_sessions',
    'view_tasks',
    'create_tasks',
    'edit_tasks',
    'view_clients',
    'create_clients',
    'edit_clients',
    'view_defendants',
    'create_defendants',
    'edit_defendants',
    'view_documents',
    'create_documents',
    'view_files',
    'view_legal_services',
    'create_legal_engagements'
  ]
}

/**
 * Self-healing: Check if the permissions and role_permissions are seeded for a company.
 * If not, seed them.
 */
export async function ensureDefaultPermissions(companyId: string): Promise<void> {
  try {
    const check = await query('SELECT 1 FROM permissions WHERE company_id = $1 LIMIT 1', [
      companyId
    ])
    if (check.rows.length === 0) {
      console.log(`[PERMISSIONS] Seeding default permissions for company ${companyId}...`)
      // Insert permissions
      for (const p of DEFAULT_PERMISSIONS) {
        await query(
          `INSERT INTO permissions (company_id, permission_key, permission_name, module_key)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (company_id, permission_key) DO NOTHING`,
          [companyId, p.key, p.name, p.module]
        )
      }

      // Insert role permissions
      for (const roleKey of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
        const perms = DEFAULT_ROLE_PERMISSIONS[roleKey]
        for (const pKey of perms) {
          await query(
            `INSERT INTO role_permissions (id, company_id, role_key, permission_key)
             VALUES (gen_random_uuid(), $1, $2, $3)
             ON CONFLICT (company_id, role_key, permission_key) DO NOTHING`,
            [companyId, roleKey, pKey]
          )
        }
      }
      console.log(`[PERMISSIONS] Default permissions seeded successfully for company ${companyId}.`)
    }
  } catch (err: any) {
    console.error(
      `[PERMISSIONS] Failed to seed default permissions for company ${companyId}:`,
      err.message
    )
  }
}

/**
 * Get all active permissions for a user from database.
 */
export async function getUserPermissions(
  companyId: string,
  userId: string,
  roleKey: string
): Promise<string[]> {
  await ensureDefaultPermissions(companyId)

  if (roleKey === 'admin') {
    return DEFAULT_PERMISSIONS.map((p) => p.key)
  }

  // 1. Fetch default role permissions
  const rolePermsResult = await query(
    'SELECT permission_key FROM role_permissions WHERE company_id = $1 AND role_key = $2',
    [companyId, roleKey]
  )
  const rolePerms = new Set(rolePermsResult.rows.map((r) => r.permission_key))

  // 2. Fetch user overrides
  const overridesResult = await query(
    'SELECT permission_key, is_allowed FROM user_permissions WHERE company_id = $1 AND user_id = $2',
    [companyId, userId]
  )

  for (const row of overridesResult.rows) {
    if (row.is_allowed === true) {
      rolePerms.add(row.permission_key)
    } else if (row.is_allowed === false) {
      rolePerms.delete(row.permission_key)
    }
  }

  return Array.from(rolePerms)
}

/**
 * Express middleware to require a specific permission.
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: 'غير مصرح: لا توجد جلسة' })
      return
    }

    const { companyId, userId, roleKey } = req.auth

    // Admin has absolute power
    if (roleKey === 'admin') {
      return next()
    }

    try {
      const userPerms = await getUserPermissions(companyId, userId, roleKey)
      if (userPerms.includes(permissionKey)) {
        return next()
      }

      res.status(403).json({
        error: 'غير مصرح',
        message: `ليس لديك الصلاحية الكافية لإتمام هذه العملية (${permissionKey}).`
      })
    } catch (err: any) {
      console.error(`[PERMISSIONS] Middleware check failed:`, err.message)
      res.status(500).json({ error: 'فشل التحقق من الصلاحيات' })
    }
  }
}
