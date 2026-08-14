/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Base de données (PostgreSQL)
  DATABASE_URL: Env.schema.secret(),
  DB_SSL: Env.schema.boolean.optional(),
  DB_POOL_MAX: Env.schema.number.optional(),

  // Limitation de débit
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  // File de travaux
  QUEUE_ENABLED: Env.schema.boolean.optional(),

  // CORS — origines autorisées en production, séparées par des virgules
  CORS_ORIGIN: Env.schema.string.optional(),
})
