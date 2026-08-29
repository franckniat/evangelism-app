import type Visit from '#models/visit'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class VisitTransformer extends BaseTransformer<Visit> {
  toObject() {
    const visit = this.resource
    const convert = visit.$preloaded.convert as typeof visit.convert | undefined

    return {
      id: visit.id,
      convertId: visit.convertId,
      scheduledAt: visit.scheduledAt?.toISO() ?? null,
      status: visit.status,
      report: visit.report,
      isOverdue: visit.isOverdue,
      completedAt: visit.completedAt?.toISO() ?? null,
      createdAt: visit.createdAt?.toISO() ?? null,

      /**
       * Présent seulement quand le dossier a été préchargé, c'est-à-dire sur
       * les écrans d'agenda où l'on a besoin de savoir qui appeler sans
       * repasser par une seconde requête.
       *
       * Prénom et initiale seulement : l'agenda n'a pas besoin de plus.
       */
      convert: convert
        ? { id: convert.id, shortName: convert.shortName, phone: convert.phone }
        : null,
    }
  }
}
