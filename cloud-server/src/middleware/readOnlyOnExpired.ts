import { Request, Response, NextFunction } from 'express'
import { query } from '../db/connection'

/**
 * Middleware للتحقق من حالة الاشتراك
 * يُطبق على routes التي تحتوي على عمليات كتابة (POST/PUT/DELETE)
 * يمنع العمليات إذا انتهت فترة التجربة ولم يكن هناك اشتراك نشط
 */
export const readOnlyOnExpiredTrial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).auth?.companyId
    
    if (!companyId) {
      return next()
    }

    // جلب معلومات الشركة
    const companyResult = await query(
      'SELECT trial_expires_at FROM companies WHERE id = $1',
      [companyId]
    )

    if (companyResult.rows.length === 0) {
      return next()
    }

    const trialExpiresAt = companyResult.rows[0].trial_expires_at
    const trialExpired = trialExpiresAt && new Date(trialExpiresAt) < new Date()

    // إذا انتهت التجربة
    if (trialExpired) {
      // التحقق من وجود اشتراك نشط
      const subCheck = await query(
        `SELECT status, current_period_end FROM subscriptions 
         WHERE company_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [companyId]
      )

      const hasActiveSub = subCheck.rows.length > 0 && 
        subCheck.rows[0].status === 'active' &&
        (!subCheck.rows[0].current_period_end || new Date(subCheck.rows[0].current_period_end) > new Date())

      // إذا لا يوجد اشتراك نشط - منع عملية الكتابة
      if (!hasActiveSub) {
        return res.status(403).json({
          error: 'ReadOnlyMode',
          message: 'انتهت فترة التجربة. النظام في وضع القراءة فقط. يرجى الاشتراك للاستمرار.',
          trialExpired: true
        })
      }
    }

    next()
  } catch (error) {
    console.error('[ReadOnly Middleware] Error:', error)
    next()
  }
}
