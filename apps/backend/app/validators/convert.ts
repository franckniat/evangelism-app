import vine from '@vinejs/vine'
import { STATUS_ORDER } from '@moisson/core'
import { VISIT_STATUSES } from '#models/visit'

/**
 * L'identifiant peut venir du client : l'application mobile crée un dossier
 * hors ligne et lui donne tout de suite son identifiant définitif, ce qui
 * évite d'avoir à réconcilier des identifiants provisoires plus tard.
 */
const clientId = () => vine.string().uuid().optional()

const statuts = STATUS_ORDER as unknown as string[]

/**
 * Un dossier doit porter au moins un moyen de recontacter la personne.
 * Sans cela il ne sert à rien : le suivi est précisément ce qu'on ne peut
 * plus faire.
 */
const auMoinsUnContact = vine.createRule((value: unknown, _options: undefined, field) => {
  const dossier = value as { phone?: string | null; email?: string | null }
  const phone = dossier.phone?.trim() ?? ''
  const email = dossier.email?.trim() ?? ''

  if (!phone && !email) {
    field.report('Renseignez un téléphone ou une adresse e-mail', 'contact.required', field)
  }
})

export const createConvertValidator = vine.create(
  vine
    .object({
      id: clientId(),
      firstName: vine.string().trim().minLength(1).maxLength(120),
      lastName: vine.string().trim().maxLength(120).nullable().optional(),
      phone: vine.string().trim().maxLength(32).nullable().optional(),
      email: vine.string().trim().email().maxLength(254).nullable().optional(),
      sex: vine.enum(['H', 'F']).nullable().optional(),
      status: vine.enum(statuts).optional(),
      sectorId: vine.string().uuid().nullable().optional(),
      notes: vine.string().trim().maxLength(5000).nullable().optional(),
      metAt: vine.date().optional(),

      /**
       * La personne a-t-elle été informée que ses coordonnées sont conservées
       * pour être recontactée ? Trois secondes sur le terrain.
       */
      consented: vine.boolean().optional(),
    })
    .use(auMoinsUnContact())
)

export const updateConvertValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(120).optional(),
  lastName: vine.string().trim().maxLength(120).nullable().optional(),
  phone: vine.string().trim().maxLength(32).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  sex: vine.enum(['H', 'F']).nullable().optional(),
  status: vine.enum(statuts).optional(),
  sectorId: vine.string().uuid().nullable().optional(),
  notes: vine.string().trim().maxLength(5000).nullable().optional(),
  consented: vine.boolean().optional(),
})

export const listConvertsValidator = vine.create({
  search: vine.string().trim().maxLength(120).optional(),
  sectorId: vine.string().uuid().optional(),
  status: vine.enum(statuts).optional(),
  page: vine.number().min(1).optional(),

  /**
   * Plafonné : pas de route qui déverse le fichier entier. Poser la limite
   * maintenant coûte une ligne ; la rétrofiter coûtera une migration de
   * clients déjà déployés.
   */
  perPage: vine.number().min(1).max(100).optional(),
})

export const createVisitValidator = vine.create({
  id: clientId(),
  convertId: vine.string().uuid(),
  scheduledAt: vine.date({ formats: { utc: true } }),
})

export const updateVisitValidator = vine.create({
  scheduledAt: vine.date({ formats: { utc: true } }).optional(),
  status: vine.enum(VISIT_STATUSES as unknown as string[]).optional(),
  report: vine.string().trim().maxLength(5000).nullable().optional(),
})

export const createSectorValidator = vine.create({
  id: clientId(),
  name: vine.string().trim().minLength(1).maxLength(120),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  country: vine.string().trim().maxLength(120).nullable().optional(),
})

export const updateSectorValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  country: vine.string().trim().maxLength(120).nullable().optional(),
})

export const noteValidator = vine.create({
  text: vine.string().trim().minLength(1).maxLength(2000),
})
