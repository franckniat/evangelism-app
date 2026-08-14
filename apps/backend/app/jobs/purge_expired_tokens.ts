import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { REFRESH_TOKEN_TTL_DAYS } from '#config/auth'

/**
 * pg-boss n'accepte que lettres, chiffres, tirets, points, soulignés et
 * barres obliques dans un nom de file — pas de deux-points.
 */
export const PURGE_EXPIRED_TOKENS = 'tokens.purge'

/**
 * Rows are kept well past their expiry on purpose.
 *
 * Reuse detection works by finding a revoked row and treating the replay as
 * theft. Delete revoked rows eagerly and a stolen token stops being
 * recognised as stolen — it simply becomes "unknown", which is a plain 401
 * and revokes nothing. Purging too soon would silently disable the mechanism
 * while every test still passed.
 *
 * The grace period is therefore counted from expiry, not from revocation: by
 * then the token could not have been exchanged anyway, so nothing is lost by
 * forgetting it.
 */
const GRACE_DAYS = REFRESH_TOKEN_TTL_DAYS

export async function purgeExpiredTokens() {
  const cutoff = DateTime.now().minus({ days: GRACE_DAYS })

  const result = await db.from('refresh_tokens').where('expires_at', '<', cutoff.toSQL()).delete()

  /**
   * Lucid types the result loosely; the driver returns the affected row count.
   */
  const deleted = Number(Array.isArray(result) ? result[0] : result) || 0

  if (deleted > 0) {
    logger.info({ deleted, cutoff: cutoff.toISO() }, 'Jetons de rafraîchissement purgés')
  }

  return deleted
}
