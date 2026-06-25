import { Request, Response, NextFunction } from 'express'

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: 'المصادقة مطلوبة' })
    return
  }
  next()
}

export function getCompanyId(req: Request): string {
  return req.auth?.companyId || ''
}

export function getUserId(req: Request): string {
  return req.auth?.userId || ''
}
