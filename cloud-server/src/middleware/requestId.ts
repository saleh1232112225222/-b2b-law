import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

const REQUEST_ID_HEADER = 'X-Request-ID'

/**
 * Attaches a unique request ID to every incoming request.
 * If the client supplies one (e.g. for distributed tracing), it is reused;
 * otherwise a new UUID is generated.
 * The ID is set on both `req` (for downstream use) and the response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined
  const id = incoming && incoming.trim().length > 0
    ? incoming.trim()
    : crypto.randomUUID()

  // Make available to downstream middleware / routes
  ;(req as any).requestId = id

  // Echo back in response so the client can correlate
  res.setHeader(REQUEST_ID_HEADER, id)

  next()
}
