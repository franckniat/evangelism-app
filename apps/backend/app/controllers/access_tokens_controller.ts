import User from '#models/user'
import TokenService from '#services/token_service'
import { sessionContextFrom } from '#services/session_context'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator, logoutValidator, refreshValidator } from '#validators/user'

export default class AccessTokensController {
  /**
   * Sign in and open a session.
   */
  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    const { accessToken, refreshToken } = await TokenService.issuePair(
      user,
      sessionContextFrom(request)
    )

    return serialize({
      user: UserTransformer.transform(user),
      accessToken,
      refreshToken,
    })
  }

  /**
   * Exchange a refresh token for a new pair.
   *
   * Deliberately unauthenticated: the whole point is to be reachable once the
   * access token has expired. The refresh token is the credential here.
   */
  async refresh({ request, serialize }: HttpContext) {
    const { refreshToken: presented } = await request.validateUsing(refreshValidator)

    const { user, accessToken, refreshToken } = await TokenService.rotate(
      presented,
      sessionContextFrom(request)
    )

    return serialize({
      user: UserTransformer.transform(user),
      accessToken,
      refreshToken,
    })
  }

  /**
   * Sign out of this device only.
   */
  async destroy({ auth, request }: HttpContext) {
    const { refreshToken } = await request.validateUsing(logoutValidator)
    const user = auth.getUserOrFail()
    const familyId = user.currentAccessToken?.name

    /**
     * The access token names its own session, so signing out no longer
     * depends on the client still holding its refresh token. The body value
     * remains accepted as a fallback.
     */
    if (familyId) {
      await TokenService.revokeSessionById(user, familyId)
    } else {
      if (user.currentAccessToken) {
        await User.accessTokens.delete(user, user.currentAccessToken.identifier)
      }

      if (refreshToken) {
        await TokenService.revokeSession(refreshToken)
      }
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
