import User from '#models/user'
import Visit from '#models/visit'
import Sector from '#models/sector'
import ConvertEvent from '#models/convert_event'
import { ConvertSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Convert extends ConvertSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Sector)
  declare sector: BelongsTo<typeof Sector>

  @hasMany(() => Visit)
  declare visits: HasMany<typeof Visit>

  @hasMany(() => ConvertEvent)
  declare events: HasMany<typeof ConvertEvent>

  /**
   * Affichage court : prénom, et initiale du nom seulement.
   *
   * Utilisé partout où la personne n'a pas besoin d'être pleinement
   * identifiée. Écrit ici plutôt que dans chaque écran, pour que ce soit
   * le chemin le plus facile à emprunter.
   */
  get shortName() {
    const initial = this.lastName?.trim()?.charAt(0)
    return initial ? `${this.firstName} ${initial.toUpperCase()}.` : this.firstName
  }

  get hasConsented() {
    return this.consentedAt !== null
  }
}
