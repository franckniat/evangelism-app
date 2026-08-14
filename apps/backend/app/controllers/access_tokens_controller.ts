import User from '#models/user'
import TokenService from '#services/token_service'
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
    const { accessToken, refreshToken } = await TokenService.issuePair(user)

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

    const { user, accessToken, refreshToken } = await TokenService.rotate(presented)

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

    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    /**
     * Without the refresh token we can revoke the access token but not the
     * session behind it, which would stay refreshable until it expires. The
     * client is expected to send it.
     */
    if (refreshToken) {
      await TokenService.revokeSession(refreshToken)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
