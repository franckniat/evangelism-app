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
        router.patch('profile', [controllers.Profile, 'update'])
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

    /**
     * Le métier : dossiers de suivi, secteurs et visites.
     *
     * Aucune de ces routes ne teste la propriété elle-même — elle est décidée
     * par les politiques. Une ressource qui n'appartient pas à l'appelant
     * répond 404 : un 403 confirmerait son existence.
     */
    router
      .group(() => {
        router.get('converts', [controllers.Converts, 'index'])
        router.post('converts', [controllers.Converts, 'store'])
        router.get('converts/:id', [controllers.Converts, 'show'])
        router.patch('converts/:id', [controllers.Converts, 'update'])
        router.delete('converts/:id', [controllers.Converts, 'destroy'])
        // Deux chemins, un seul gestionnaire : il faut donc nommer
        // explicitement, sinon les noms générés entrent en collision.
        router.post('converts/:id/notes', [controllers.Converts, 'addEvent']).as('add_note')
        router.post('converts/:id/calls', [controllers.Converts, 'addEvent']).as('log_call')

        router.get('sectors', [controllers.Sectors, 'index'])
        router.post('sectors', [controllers.Sectors, 'store'])
        router.patch('sectors/:id', [controllers.Sectors, 'update'])
        router.delete('sectors/:id', [controllers.Sectors, 'destroy'])

        router.get('visits', [controllers.Visits, 'index'])
        router.post('visits', [controllers.Visits, 'store'])
        router.patch('visits/:id', [controllers.Visits, 'update'])
        router.delete('visits/:id', [controllers.Visits, 'destroy'])
      })
      .as('data')
      .use([middleware.auth(), throttleSessions])
  })
  .prefix('/api/v1')
