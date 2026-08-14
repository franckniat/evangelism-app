import TokenService from '#services/token_service'
import { sessionIdValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The devices currently signed in to an account.
 *
 * This screen exists so that a takeover is noticeable and reversible by the
 * person it affects, without anyone having to intervene in the database.
 */
export default class SessionsController {
  /**
   * List the sessions that can still be used.
   */
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    return serialize({
      sessions: await TokenService.listSessions(user, this.#currentFamilyId(auth)),
    })
  }

  /**
   * Sign a single device out.
   */
  async destroy({ auth, params, response, request }: HttpContext) {
    const { id } = await sessionIdValidator.validate(params)
    const user = auth.getUserOrFail()

    const revoked = await TokenService.revokeSessionById(user, id)

    if (!revoked) {
      return response.notFound({ message: 'Session not found' })
    }

    return {
      message: 'Session revoked',
      /**
       * Revoking the session you are currently using is a legitimate action —
       * it is what "sign out everywhere" does from this device. Saying so lets
       * the client discard its own credentials instead of discovering it on
       * the next request.
       */
      self: id === this.#currentFamilyId(auth),
      requestId: request.id(),
    }
  }

  /**
   * Sign out every other device. The answer to "I do not recognise that one".
   */
  async destroyOthers({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const revoked = await TokenService.revokeOtherSessions(user, this.#currentFamilyId(auth))

    return serialize({ revoked })
  }

  /**
   * The family this request's access token belongs to, carried in the token's
   * `name`. Null for tokens issued before sessions existed.
   */
  #currentFamilyId(auth: HttpContext['auth']) {
    return auth.getUserOrFail().currentAccessToken?.name ?? null
  }
}
