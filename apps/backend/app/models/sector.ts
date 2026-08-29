import User from '#models/user'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import Convert from '#models/convert'
import { SectorSchema } from '#database/schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Sector extends SectorSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Convert)
  declare converts: HasMany<typeof Convert>
}
