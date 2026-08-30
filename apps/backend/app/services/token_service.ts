import User from '#models/user'
import { DateTime } from 'luxon'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import RefreshToken from '#models/refresh_token'
import { REFRESH_TOKEN_TTL_DAYS } from '#config/auth'
import InvalidRefreshTokenException from '#exceptions/invalid_refresh_token_exception'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type RevocationReason = 'rotated' | 'reuse_detected' | 'logout' | 'logout_all'

/**
 * Where a session is being used from. Captured at every exchange, so the list
 * shows where a session is active *now*, not where it started.
 */
export type SessionContext = {
  userAgent: string | null
  ipAddress: string | null
}

export type Session = {
  id: string
  startedAt: string | null
  lastSeenAt: string | null
  expiresAt: string | null
  userAgent: string | null
  ipAddress: string | null
  current: boolean
}

/**
 * Why a token pair rather than one long-lived token
 * -------------------------------------------------
 * A single token that never expires cannot be taken back. Harvest holds the
 * names and phone numbers of people who never signed up for it, so "the
 * attacker keeps access until someone notices" is not an acceptable failure
 * mode.
 *
 * Access tokens are therefore short-lived and checked on every request, while
 * the session itself lives in a refresh token that rotates on each use.
 *
 * Rotation buys the property that matters: a refresh token is valid exactly
 * once. If the same one is presented twice, either the legitimate client
 * replayed it or somebody copied it — and we cannot tell which. The safe
 * reading is theft, so the whole family is revoked and the device is signed
 * out. That is why revoked rows are kept instead of deleted: the evidence has
 * to outlive the token.
 */
export default class TokenService {
  /**
   * SHA-256 is enough here, unlike for passwords. The input is 256 bits of
   * randomness, so there is no dictionary to run and no reason to pay for a
   * slow hash on every refresh.
   */
  static hash(secret: string) {
    return createHash('sha256').update(secret).digest('hex')
  }

  /**
   * Open a new session: a fresh family, and the first token in it.
   */
  static async issuePair(user: User, context: SessionContext) {
    const familyId = randomUUID()

    return {
      accessToken: await this.#issueAccessToken(user, familyId),
      refreshToken: await this.#issueRefreshToken(user, familyId, context),
    }
  }

  /**
   * Exchange a refresh token for the next pair in the same family.
   */
  static async rotate(rawToken: string, context: SessionContext) {
    const hash = this.hash(rawToken)

    /**
     * The transaction reports what it found instead of throwing.
     *
     * Raising from inside it would roll back the very revocation we want to
     * keep: the theft would be detected, then quietly forgiven, leaving the
     * stolen token usable. Reacting happens once the transaction is closed.
     */
    const outcome = await db.transaction(async (trx) => {
      /**
       * Locked for the duration of the exchange. Without this, two concurrent
       * refreshes carrying the same token could both be served, and a plain
       * race would look exactly like a stolen token.
       */
      const found = await RefreshToken.query({ client: trx })
        .where('hash', hash)
        .forUpdate()
        .first()

      if (!found) {
        return { kind: 'invalid' } as const
      }

      if (found.isRevoked) {
        return { kind: 'reuse', familyId: found.familyId, userId: found.userId } as const
      }

      if (found.isExpired) {
        return { kind: 'invalid' } as const
      }

      found.useTransaction(trx)
      found.usedAt = DateTime.now()
      found.revokedAt = DateTime.now()
      found.revokedReason = 'rotated'
      await found.save()

      const owner = await User.query({ client: trx }).where('id', found.userId).firstOrFail()

      return { kind: 'rotated', familyId: found.familyId, user: owner } as const
    })

    if (outcome.kind === 'reuse') {
      /**
       * Presented after it was already spent. Treat it as theft: revoke the
       * entire chain, which signs out whoever holds the current token —
       * including the legitimate user, who will simply sign in again.
       */
      await this.#revokeFamily(outcome.familyId, 'reuse_detected')

      logger.warn(
        { userId: outcome.userId, familyId: outcome.familyId },
        'Jeton de rafraîchissement révoqué présenté à nouveau — famille révoquée'
      )

      throw new InvalidRefreshTokenException()
    }

    if (outcome.kind === 'invalid') {
      throw new InvalidRefreshTokenException()
    }

    return {
      user: outcome.user,
      accessToken: await this.#issueAccessToken(outcome.user, outcome.familyId),
      refreshToken: await this.#issueRefreshToken(outcome.user, outcome.familyId, context),
    }
  }

  /**
   * End the session a refresh token belongs to, and only that one: the other
   * devices of the same user keep working.
   *
   * Never raises. Signing out must succeed even when the token handed over is
   * already gone — a client that cannot log out will keep retrying with a
   * credential it wanted to get rid of.
   */
  static async revokeSession(rawToken: string) {
    const token = await RefreshToken.findBy('hash', this.hash(rawToken))
    if (!token) {
      return
    }

    await this.#revokeFamily(token.familyId, 'logout')
  }

  /**
   * Sign out every device. Used when credentials change, and the reaction to
   * a suspected compromise.
   */
  static async revokeAllSessions(user: User) {
    await RefreshToken.query()
      .where('user_id', user.id)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL(), revoked_reason: 'logout_all' })

    await User.accessTokens
      .all(user)
      .then((tokens) =>
        Promise.all(tokens.map((token) => User.accessTokens.delete(user, token.identifier)))
      )
  }

  static async #issueAccessToken(user: User, familyId: string) {
    /**
     * The family is carried in `name` so a request can tell which session it
     * belongs to. Without it, "Cet appareil" cannot be marked in the session
     * list: a request presents an access token, and nothing otherwise ties it
     * back to the refresh chain it came from.
     */
    const token = await User.accessTokens.create(user, ['*'], { name: familyId })

    return {
      value: token.value!.release(),
      expiresAt: token.expiresAt ? DateTime.fromJSDate(token.expiresAt).toISO() : null,
    }
  }

  static async #issueRefreshToken(user: User, familyId: string, context: SessionContext) {
    /**
     * 32 bytes of entropy, url-safe so it survives being put in a header or a
     * JSON body untouched.
     */
    const secret = randomBytes(32).toString('base64url')
    const expiresAt = DateTime.now().plus({ days: REFRESH_TOKEN_TTL_DAYS })

    await RefreshToken.create({
      userId: user.id,
      familyId,
      hash: this.hash(secret),
      expiresAt,
      userAgent: context.userAgent?.slice(0, 512) ?? null,
      ipAddress: context.ipAddress?.slice(0, 45) ?? null,
    })

    return {
      value: secret,
      expiresAt: expiresAt.toISO(),
    }
  }

  /**
   * Every session that can still be used, most recently active first.
   *
   * A session is a family, not a row: rotation means one family spans many
   * rows. The dates are therefore aggregated — first row is when the device
   * signed in, last row is when it was last seen.
   */
  static async listSessions(user: User, currentFamilyId?: string | null): Promise<Session[]> {
    const rows = await db
      .from('refresh_tokens')
      .where('user_id', user.id)
      .groupBy('family_id')
      .havingRaw('bool_or(revoked_at is null and expires_at > now())')
      .select('family_id')
      .select(db.raw('min(created_at) as started_at'))
      .select(db.raw('max(created_at) as last_seen_at'))
      .select(db.raw('max(expires_at) as expires_at'))
      .select(db.raw('(array_agg(user_agent order by id desc))[1] as user_agent'))
      .select(db.raw('(array_agg(ip_address order by id desc))[1] as ip_address'))
      .orderByRaw('max(created_at) desc')

    return rows.map((row) => ({
      id: row.family_id,
      startedAt: this.#toIso(row.started_at),
      lastSeenAt: this.#toIso(row.last_seen_at),
      expiresAt: this.#toIso(row.expires_at),
      userAgent: row.user_agent ?? null,
      ipAddress: row.ip_address ?? null,
      current: !!currentFamilyId && row.family_id === currentFamilyId,
    }))
  }

  /**
   * Sign a single device out.
   *
   * Ownership is checked against the requesting user, and a family belonging
   * to someone else is reported as simply not found: answering "forbidden"
   * would confirm that it exists.
   */
  static async revokeSessionById(user: User, familyId: string) {
    const owned = await RefreshToken.query()
      .where('user_id', user.id)
      .where('family_id', familyId)
      .first()

    if (!owned) {
      return false
    }

    await this.#revokeFamily(familyId, 'logout')
    await this.#deleteAccessTokensOfFamily(user, familyId)

    return true
  }

  /**
   * Sign out every device except the one asking. The reaction to "I do not
   * recognise that session".
   */
  static async revokeOtherSessions(user: User, currentFamilyId: string | null) {
    const families = await db
      .from('refresh_tokens')
      .where('user_id', user.id)
      .whereNull('revoked_at')
      .distinct('family_id')

    const others = families
      .map((row) => row.family_id as string)
      .filter((familyId) => familyId !== currentFamilyId)

    for (const familyId of others) {
      await this.#revokeFamily(familyId, 'logout_all')
      await this.#deleteAccessTokensOfFamily(user, familyId)
    }

    return others.length
  }

  /**
   * Access tokens outlive their session otherwise: they are verified against
   * their own table, and revoking the refresh chain alone would leave a valid
   * one usable until it expires.
   */
  static async #deleteAccessTokensOfFamily(user: User, familyId: string) {
    const tokens = await User.accessTokens.all(user)

    await Promise.all(
      tokens
        .filter((token) => token.name === familyId)
        .map((token) => User.accessTokens.delete(user, token.identifier))
    )
  }

  static #toIso(value: unknown) {
    if (value instanceof Date) {
      return DateTime.fromJSDate(value).toISO()
    }

    return typeof value === 'string' ? value : null
  }

  static async #revokeFamily(
    familyId: string,
    reason: RevocationReason,
    trx?: TransactionClientContract
  ) {
    const query = trx ? RefreshToken.query({ client: trx }) : RefreshToken.query()

    await query
      .where('family_id', familyId)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL(), revoked_reason: reason })
  }
}
