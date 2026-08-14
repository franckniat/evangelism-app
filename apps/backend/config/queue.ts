import env from '#start/env'

/**
 * Background jobs are backed by PostgreSQL, for the same reason as the rate
 * limiter: no second service to run, and one less thing that can be down.
 *
 * pg-boss keeps its own tables in a dedicated schema and migrates them on
 * start, so nothing here belongs in `database/migrations`.
 */
const queueConfig = {
  connectionString: env.get('DATABASE_URL').release(),
  ssl: env.get('DB_SSL', true),

  /**
   * Kept apart from the application tables so `pg_dump` of one is not the
   * other, and so a queue reset never risks touching business data.
   */
  schema: 'pgboss',

  /**
   * Retries with growing delays. A reminder that fails because the push
   * provider is down should not be lost — the whole point of having a queue
   * rather than sending inline.
   */
  retryLimit: 5,
  retryBackoff: true,
  retryDelay: 30,

  /**
   * Disabled in tests, where jobs must not run behind the assertions.
   */
  enabled: env.get('QUEUE_ENABLED', true),
}

export default queueConfig
