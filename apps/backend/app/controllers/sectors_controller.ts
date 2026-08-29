import db from '@adonisjs/lucid/services/db'
import Sector from '#models/sector'
import type { HttpContext } from '@adonisjs/core/http'
import SectorTransformer from '#transformers/sector_transformer'
import { createSectorValidator, updateSectorValidator } from '#validators/convert'

export default class SectorsController {
  async index({ auth, serialize }: HttpContext) {
    const sectors = await Sector.query()
      .where('user_id', auth.getUserOrFail().id)
      .select('sectors.*')
      .select(
        db.raw(
          '(select count(*) from converts where converts.sector_id = sectors.id) as converts_count'
        )
      )
      .orderBy('name', 'asc')

    return serialize({ sectors: SectorTransformer.transform(sectors) })
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createSectorValidator)

    const sector = await Sector.create({
      id: data.id,
      userId: auth.getUserOrFail().id,
      name: data.name,
      city: data.city ?? null,
      country: data.country ?? null,
    })

    return response.created(await serialize(SectorTransformer.transform(sector)))
  }

  async update({ bouncer, params, request, response, serialize }: HttpContext) {
    const sector = await Sector.find(params.id)

    if (!sector || (await bouncer.with('SectorPolicy').allows('update', sector)) === false) {
      return response.notFound({ message: 'Secteur introuvable' })
    }

    const data = await request.validateUsing(updateSectorValidator)

    sector.merge({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.country !== undefined ? { country: data.country } : {}),
    })

    await sector.save()

    return serialize(SectorTransformer.transform(sector))
  }

  /**
   * Supprimer un secteur ne supprime pas les dossiers qu'il portait : ils
   * se retrouvent sans secteur (`ON DELETE SET NULL`). Perdre un libellé
   * d'organisation ne doit jamais faire perdre le suivi de personnes.
   */
  async destroy({ bouncer, params, response }: HttpContext) {
    const sector = await Sector.find(params.id)

    if (!sector || (await bouncer.with('SectorPolicy').allows('destroy', sector)) === false) {
      return response.notFound({ message: 'Secteur introuvable' })
    }

    await sector.delete()

    return { message: 'Secteur supprimé' }
  }
}
