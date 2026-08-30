import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/limiter'

/**
 * Rate limiting is backed by PostgreSQL rather than Redis.
 *
 * Redis is the usual choice and remains the better one at scale, but it is
 * one more service to run and the project does not have it yet. The database
 * store is durable, survives restarts, and works across instances — enough
 * for the volumes Harvest will see for a long while.
 *
 * Switching later is a change of `LIMITER_STORE`, not of code.
 */
const limiterConfig = defineConfig({
  default: env.get('LIMITER_STORE'),

  stores: {
    /**
     * Rate limiting data stored in PostgreSQL.
     */
    database: stores.database({
      tableName: 'rate_limits',
    }),

    /**
     * Used by the test suite, so tests do not share counters with each other
     * or leave rows behind.
     */
    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
