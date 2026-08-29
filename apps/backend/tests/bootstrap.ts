import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  /**
   * Le schéma est appliqué une fois pour toute la campagne, puis les tables
   * sont vidées entre chaque test (voir `configureSuite`).
   *
   * ⚠️ Ces utilitaires effacent la base pointée par `DATABASE_URL`. Elle doit
   * rester distincte de celle de développement : voir `.env.test`.
   */
  setup: [() => testUtils.db().migrate()],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.httpServer().start())

    /**
     * Chaque test repart d'une base vide. Sans cela, un test qui crée un
     * compte fait échouer le suivant sur une contrainte d'unicité, et
     * l'ordre d'exécution devient une dépendance cachée.
     *
     * Les compteurs du limiteur sont remis à zéro pour la même raison : ils
     * vivent en mémoire pour toute la campagne, et l'inscription est
     * plafonnée par adresse IP — que tous les tests partagent. Sans ce
     * nettoyage, le onzième test échouerait sur une limite que rien dans
     * son code n'explique.
     */
    suite.onTest((test) =>
      test.setup(async () => {
        await testUtils.db().truncate()
        await limiter.clear()
      })
    )
  }
}
