/**
 * Admin Guard - حماية صفحات الأدمن
 * يتحقق من أن المستخدم يملك صلاحيات Super Admin
 * companyId = '00000000-0000-0000-0000-000000000000'
 */

const SUPER_ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000000'

/**
 * التحقق من أن المستخدم هو Super Admin
 * @returns {boolean}
 */
export function isSuperAdmin(session: any): boolean {
  if (!session) return false
  return session.companyId === SUPER_ADMIN_COMPANY_ID
}

/**
 * Guard للـ Router
 * إذا لم يكن المستخدم Super Admin، يُعاد توجيهه للصفحة الرئيسية
 */
export function superAdminGuard(to: any, from: any, next: any, session: any) {
  if (!isSuperAdmin(session)) {
    // ليس Super Admin - أعد توجيهه
    next({ path: '/', replace: true })
    return
  }
  // Super Admin - اسمح بالمرور
  next()
}
