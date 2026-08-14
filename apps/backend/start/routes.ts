/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { throttleAuth, throttleSessions, throttleSignup } from '#start/limiter'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store']).use(throttleSignup)
        router.post('login', [controllers.AccessTokens, 'store']).use(throttleAuth)

        /**
         * Unauthenticated on purpose: it must stay reachable once the access
         * token has expired. The refresh token carried in the body is the
         * credential.
         */
        router.post('refresh', [controllers.AccessTokens, 'refresh']).use(throttleAuth)
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])

        /**
         * Appareils connectés. Déclaré avant la route paramétrée pour que
         * « revoke-others » ne soit pas interprété comme un identifiant.
         */
        router.get('sessions', [controllers.Sessions, 'index'])
        router.post('sessions/revoke-others', [controllers.Sessions, 'destroyOthers'])
        router.delete('sessions/:id', [controllers.Sessions, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use([middleware.auth(), throttleSessions])
  })
  .prefix('/api/v1')
