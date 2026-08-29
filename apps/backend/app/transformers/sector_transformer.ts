import type Sector from '#models/sector'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SectorTransformer extends BaseTransformer<Sector> {
  toObject() {
    const sector = this.resource

    return {
      id: sector.id,
      name: sector.name,
      city: sector.city,
      country: sector.country,
      convertsCount: Number(sector.$extras.converts_count ?? 0),
      createdAt: sector.createdAt?.toISO() ?? null,
    }
  }
}
