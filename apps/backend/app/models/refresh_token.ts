import User from '#models/user'
import { DateTime } from 'luxon'
import { belongsTo } from '@adonisjs/lucid/orm'
import { RefreshTokenSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RefreshToken extends RefreshTokenSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isRevoked() {
    return this.revokedAt !== null
  }

  get isExpired() {
    return this.expiresAt <= DateTime.now()
  }

  /**
   * A token is only exchangeable once, before it expires. Anything else is
   * either a replay or a stale client.
   */
  get isUsable() {
    return !this.isRevoked && !this.isExpired
  }
}
