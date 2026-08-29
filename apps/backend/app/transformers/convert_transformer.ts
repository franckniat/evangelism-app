import type Convert from '#models/convert'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ConvertTransformer extends BaseTransformer<Convert> {
  toObject() {
    const convert = this.resource

    return {
      id: convert.id,
      firstName: convert.firstName,
      lastName: convert.lastName,
      shortName: convert.shortName,
      phone: convert.phone,
      email: convert.email,
      sex: convert.sex,
      status: convert.status,
      sectorId: convert.sectorId,
      notes: convert.notes,
      hasConsented: convert.hasConsented,
      metAt: convert.metAt?.toISO() ?? null,
      createdAt: convert.createdAt?.toISO() ?? null,
      updatedAt: convert.updatedAt?.toISO() ?? null,

      /**
       * Calculée par sous-requête sur les visites plutôt que stockée sur le
       * dossier : une valeur dupliquée finit toujours par diverger de sa
       * source.
       */
      nextVisitAt: convert.$extras.next_visit_at
        ? new Date(convert.$extras.next_visit_at).toISOString()
        : null,
    }
  }
}
