import { Request, Response, NextFunction } from 'express'
import { AuthPayload } from './auth'

/**
 * Middleware للتحقق من صلاحية الاشتراك
 * يُستخدم لحماية الـ routes من المستخدمين الذين انتهت فترة تجربتهم
 * ولم يشتركوا بعد
 */
export const requireActiveSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const auth = req.auth as AuthPayload | undefined
  
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const trialExpired = auth.trialExpired
  const subscriptionStatus = auth.subscriptionStatus

  // السماح للأدمن بالمرور دائماً
  if (auth.roleKey === 'admin' && auth.companyId === '00000000-0000-0000-0000-000000000000') {
    return next()
  }

  // إذا انتهت التجربة وليس هناك اشتراك نشط
  if (trialExpired && subscriptionStatus !== 'active') {
    return res.status(403).json({
      error: 'SubscriptionExpired',
      message: 'انتهت فترة التجربة المجانية. يرجى الاشتراك في إحدى الخطط للمتابعة.',
      code: 'TRIAL_EXPIRED'
    })
  }

  // إذا كان الاشتراك ملغى أو منتهي
  if (subscriptionStatus === 'canceled' || subscriptionStatus === 'expired') {
    return res.status(403).json({
      error: 'SubscriptionInactive',
      message: 'الاشتراك غير نشط. يرجى تجديد الاشتراك.',
      code: 'SUBSCRIPTION_INACTIVE'
    })
  }

  next()
}

/**
 * Middleware للتحقق من حالة "قراءة فقط"
 * يُطبق على عمليات POST/PUT/DELETE عندما تكون التجربة منتهية
 * ولكن يُسمح بالوصول للقراءة
 */
export const readOnlyOnExpiredTrial = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const auth = req.auth as AuthPayload | undefined
  
  if (!auth) {
    return next()
  }

  const trialExpired = auth.trialExpired
  const subscriptionStatus = auth.subscriptionStatus

  // السماح للأدمن
  if (auth.roleKey === 'admin' && auth.companyId === '00000000-0000-0000-0000-000000000000') {
    return next()
  }

  // إذا انتهت التجربة وليس هناك اشتراك نشط - قراءة فقط
  if (trialExpired && subscriptionStatus !== 'active') {
    // السماح بعمليات GET
    if (req.method === 'GET') {
      return next()
    }

    // منع عمليات الكتابة
    return res.status(403).json({
      error: 'ReadOnlyMode',
      message: 'وضع القراءة فقط: انتهت فترة التجربة. يرجى الاشتراك لإجراء تغييرات.',
      code: 'READ_ONLY_MODE'
    })
  }

  next()
}
