import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Convert from '#models/convert'
import ConvertEvent from '#models/convert_event'
import type { HttpContext } from '@adonisjs/core/http'
import ConvertTransformer from '#transformers/convert_transformer'
import ConvertEventTransformer from '#transformers/convert_event_transformer'
import VisitTransformer from '#transformers/visit_transformer'
import {
  createConvertValidator,
  listConvertsValidator,
  noteValidator,
  updateConvertValidator,
} from '#validators/convert'

/**
 * Les dossiers de suivi.
 *
 * ⚠️ La propriété n'est jamais testée ici : elle est décidée par la politique
 * (`#policies/convert_policy`), qui s'appuie sur la règle unique de
 * `#abilities/ownership`. Le jour où cette règle s'élargit aux églises et aux
 * partages, aucun contrôleur ne doit avoir à changer.
 *
 * Une ressource qui ne nous appartient pas répond **404 et non 403** :
 * répondre « interdit » confirmerait son existence.
 */
export default class ConvertsController {
  async index({ auth, request, serialize }: HttpContext) {
    const { search, sectorId, status, page, perPage } =
      await request.validateUsing(listConvertsValidator)

    const query = Convert.query()
      .where('user_id', auth.getUserOrFail().id)
      .select('converts.*')
      .select(
        db.raw(
          `(select min(scheduled_at) from visits
             where visits.convert_id = converts.id and visits.status = 'planned') as next_visit_at`
        )
      )

    if (sectorId) query.where('sector_id', sectorId)
    if (status) query.where('status', status)

    if (search) {
      const motif = `%${search.toLowerCase()}%`
      query.where((builder) => {
        builder
          .whereRaw('lower(first_name) like ?', [motif])
          .orWhereRaw('lower(coalesce(last_name, %s)) like ?'.replace('%s', "''"), [motif])
          .orWhereRaw('lower(coalesce(phone, %s)) like ?'.replace('%s', "''"), [motif])
      })
    }

    const dossiers = await query
      .orderByRaw('next_visit_at asc nulls last')
      .orderBy('created_at', 'desc')
      .paginate(page ?? 1, perPage ?? 50)

    return serialize({
      converts: ConvertTransformer.transform(dossiers.all()),
      meta: dossiers.getMeta(),
    })
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createConvertValidator)
    const user = auth.getUserOrFail()

    const convert = await db.transaction(async (trx) => {
      const created = await Convert.create(
        {
          id: data.id,
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          sex: data.sex ?? null,
          status: data.status ?? 'reflexion',
          sectorId: data.sectorId ?? null,
          notes: data.notes ?? null,
          metAt: data.metAt ?? null,
          consentedAt: data.consented ? DateTime.now() : null,
        },
        { client: trx }
      )

      await ConvertEvent.create(
        { userId: user.id, convertId: created.id, type: 'created', text: null },
        { client: trx }
      )

      return created
    })

    return response.created(await serialize(ConvertTransformer.transform(convert)))
  }

  async show({ bouncer, params, response, serialize }: HttpContext) {
    const convert = await Convert.find(params.id)

    if (!convert || (await bouncer.with('ConvertPolicy').allows('view', convert)) === false) {
      return response.notFound({ message: 'Dossier introuvable' })
    }

    const [visits, events] = await Promise.all([
      convert.related('visits').query().orderBy('scheduled_at', 'desc'),
      convert.related('events').query().orderBy('created_at', 'desc').limit(50),
    ])

    return serialize({
      convert: ConvertTransformer.transform(convert),
      visits: VisitTransformer.transform(visits),
      events: ConvertEventTransformer.transform(events),
    })
  }

  async update({ bouncer, params, request, response, serialize }: HttpContext) {
    const convert = await Convert.find(params.id)

    if (!convert || (await bouncer.with('ConvertPolicy').allows('update', convert)) === false) {
      return response.notFound({ message: 'Dossier introuvable' })
    }

    const data = await request.validateUsing(updateConvertValidator)
    const ancienStatut = convert.status

    convert.merge({
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.sex !== undefined ? { sex: data.sex } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.sectorId !== undefined ? { sectorId: data.sectorId } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.consented === true && !convert.consentedAt ? { consentedAt: DateTime.now() } : {}),
    })

    await convert.save()

    if (data.status !== undefined && data.status !== ancienStatut) {
      await ConvertEvent.create({
        userId: convert.userId,
        convertId: convert.id,
        type: 'status_changed',
        text: `${ancienStatut} → ${data.status}`,
      })
    }

    return serialize(ConvertTransformer.transform(convert))
  }

  async destroy({ bouncer, params, response }: HttpContext) {
    const convert = await Convert.find(params.id)

    if (!convert || (await bouncer.with('ConvertPolicy').allows('destroy', convert)) === false) {
      return response.notFound({ message: 'Dossier introuvable' })
    }

    /**
     * Suppression réelle, visites et fil compris (cascade en base). Une
     * personne qui demande à disparaître d'un fichier doit en disparaître.
     */
    await convert.delete()

    return { message: 'Dossier supprimé' }
  }

  /**
   * Ajouter une note ou consigner un appel. En ajout seul : on ne corrige
   * pas une note, on en ajoute une autre.
   */
  async addEvent({ bouncer, params, request, response, serialize }: HttpContext) {
    const convert = await Convert.find(params.id)

    if (!convert || (await bouncer.with('ConvertPolicy').allows('update', convert)) === false) {
      return response.notFound({ message: 'Dossier introuvable' })
    }

    const { text } = await request.validateUsing(noteValidator)
    const type = request.url().endsWith('/calls') ? 'call' : 'note'

    const event = await ConvertEvent.create({
      userId: convert.userId,
      convertId: convert.id,
      type,
      text,
    })

    return response.created(await serialize(ConvertEventTransformer.transform(event)))
  }
}
