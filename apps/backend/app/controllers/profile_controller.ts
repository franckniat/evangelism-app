import UserTransformer from '#transformers/user_transformer'
import { updateProfileValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  /**
   * Le nom affiché et l'église. Volontairement pas l'adresse ni le mot de
   * passe : tous deux déplacent l'identité du compte et demandent une
   * vérification qui n'existe pas encore.
   */
  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)

    user.merge({
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.church !== undefined ? { church: data.church } : {}),
    })

    await user.save()

    return serialize(UserTransformer.transform(user))
  }
}
