import limiter from '@adonisjs/limiter/services/main'

/**
 * HTTP rate limits.
 *
 * A note on the numbers: Moisson targets Cameroon, where a large share of
 * users reach the internet through mobile carrier NAT. Thousands of people
 * can share one public address, so per-IP limits are set to catch floods
 * rather than to be tight — a strict per-IP rule would lock out a whole
 * carrier because one person misbehaved.
 *
 * The precise protection lives elsewhere: failed logins are counted per
 * account in the controller, where only failures are charged.
 */

/**
 * Sign-in and token exchange. Generous per address, on purpose (see above).
 * Refreshing is a routine client operation, several times a day per device.
 */
export const throttleAuth = limiter.define('auth', (ctx) => {
  return limiter.allowRequests(120).every('15 minutes').usingKey(ctx.request.ip())
})

/**
 * Account creation. No legitimate reason to open accounts in bursts, and
 * this is the endpoint that fills the database if left open.
 */
export const throttleSignup = limiter.define('signup', (ctx) => {
  return limiter.allowRequests(10).every('1 hour').usingKey(ctx.request.ip())
})

/**
 * Session management. Tied to the authenticated user rather than the address,
 * which is both fairer behind NAT and the right unit for these routes.
 */
export const throttleSessions = limiter.define('sessions', (ctx) => {
  const userId = ctx.auth?.user?.id

  if (!userId) {
    return limiter.allowRequests(30).every('15 minutes').usingKey(ctx.request.ip())
  }

  return limiter.allowRequests(60).every('15 minutes').usingKey(`user_${userId}`)
})
