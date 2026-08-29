import User from '#models/user'
import Convert from '#models/convert'
import { belongsTo } from '@adonisjs/lucid/orm'
import { ConvertEventSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const EVENT_TYPES = [
  'created',
  'note',
  'call',
  'status_changed',
  'visit_planned',
  'visit_done',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export default class ConvertEvent extends ConvertEventSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Convert)
  declare convert: BelongsTo<typeof Convert>
}
