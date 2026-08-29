import { DateTime } from 'luxon'
import Visit from '#models/visit'
import Convert from '#models/convert'
import ConvertEvent from '#models/convert_event'
import type { HttpContext } from '@adonisjs/core/http'
import VisitTransformer from '#transformers/visit_transformer'
import { createVisitValidator, updateVisitValidator } from '#validators/convert'

/**
 * Les visites de suivi.
 *
 * L'écran qui compte pour un évangéliste n'est pas la liste de ses convertis,
 * c'est « qu'est-ce que je fais aujourd'hui ». D'où le regroupement par
 * échéance plutôt que par dossier.
 */
export default class VisitsController {
  async index({ auth, request, serialize }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const scope = request.input('scope', 'upcoming')

    const query = Visit.query().where('user_id', userId).preload('convert')

    if (scope === 'overdue') {
      query.where('status', 'planned').where('scheduled_at', '<', DateTime.now().toSQL())
    } else if (scope === 'today') {
      query
        .where('status', 'planned')
        .whereBetween('scheduled_at', [
          DateTime.now().startOf('day').toSQL(),
          DateTime.now().endOf('day').toSQL(),
        ])
    } else if (scope === 'upcoming') {
      query.where('status', 'planned').where('scheduled_at', '>=', DateTime.now().toSQL())
    }

    const visits = await query.orderBy('scheduled_at', 'asc').limit(200)

    return serialize({ visits: VisitTransformer.transform(visits) })
  }

  async store({ auth, bouncer, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createVisitValidator)
    const convert = await Convert.find(data.convertId)

    /**
     * On vérifie la propriété du **dossier**, pas de la visite : c'est le
     * dossier qui porte la donnée personnelle. Planifier une visite chez
     * quelqu'un qu'on ne suit pas n'a pas de sens.
     */
    if (!convert || (await bouncer.with('ConvertPolicy').allows('update', convert)) === false) {
      return response.notFound({ message: 'Dossier introuvable' })
    }

    const visit = await Visit.create({
      id: data.id,
      userId: auth.getUserOrFail().id,
      convertId: convert.id,
      scheduledAt: data.scheduledAt,
      status: 'planned',
    })

    await ConvertEvent.create({
      userId: convert.userId,
      convertId: convert.id,
      type: 'visit_planned',
      text: data.scheduledAt.toISODate(),
    })

    return response.created(await serialize(VisitTransformer.transform(visit)))
  }

  async update({ bouncer, params, request, response, serialize }: HttpContext) {
    const visit = await Visit.find(params.id)

    if (!visit || (await bouncer.with('VisitPolicy').allows('update', visit)) === false) {
      return response.notFound({ message: 'Visite introuvable' })
    }

    const data = await request.validateUsing(updateVisitValidator)

    visit.merge({
      ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.report !== undefined ? { report: data.report } : {}),
      ...(data.status === 'done' ? { completedAt: DateTime.now() } : {}),
    })

    await visit.save()

    if (data.status === 'done') {
      await ConvertEvent.create({
        userId: visit.userId,
        convertId: visit.convertId,
        type: 'visit_done',
        text: data.report ?? null,
      })
    }

    return serialize(VisitTransformer.transform(visit))
  }

  async destroy({ bouncer, params, response }: HttpContext) {
    const visit = await Visit.find(params.id)

    if (!visit || (await bouncer.with('VisitPolicy').allows('destroy', visit)) === false) {
      return response.notFound({ message: 'Visite introuvable' })
    }

    await visit.delete()

    return { message: 'Visite supprimée' }
  }
}
