import type { HttpContext } from '@adonisjs/core/http'
import type { SessionContext } from '#services/token_service'

/**
 * Capture where a request comes from, to be stored alongside the session it
 * opens or refreshes.
 *
 * ⚠️ `request.ip()` only tells the truth once the proxy configuration is set
 * for the deployment: behind a load balancer without it, every session is
 * recorded as coming from the proxy. To revisit when hosting is decided.
 */
export function sessionContextFrom(request: HttpContext['request']): SessionContext {
  return {
    userAgent: request.header('user-agent') ?? null,
    ipAddress: request.ip() ?? null,
  }
}
