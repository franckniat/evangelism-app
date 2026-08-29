import User from '#models/user'
import Convert from '#models/convert'
import { DateTime } from 'luxon'
import { belongsTo } from '@adonisjs/lucid/orm'
import { VisitSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const VISIT_STATUSES = ['planned', 'done', 'postponed', 'missed', 'cancelled'] as const
export type VisitStatus = (typeof VISIT_STATUSES)[number]

export default class Visit extends VisitSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Convert)
  declare convert: BelongsTo<typeof Convert>

  get isPending() {
    return this.status === 'planned'
  }

  /**
   * Une visite planifiée dont l'heure est passée sans qu'on ait dit ce
   * qu'elle est devenue. C'est la file d'attente réelle du suivi.
   */
  get isOverdue() {
    return this.isPending && this.scheduledAt < DateTime.now()
  }
}
