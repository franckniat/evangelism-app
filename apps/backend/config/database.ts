import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   */
  connection: 'postgres',

  connections: {
    /**
     * PostgreSQL connection.
     *
     * The connection string is provided as a single `DATABASE_URL` variable,
     * which is the format handed out by managed providers (Neon, Supabase,
     * Railway…). It contains a password: it lives in `.env` and never in the
     * repository.
     */
    postgres: {
      client: 'pg',

      connection: {
        connectionString: env.get('DATABASE_URL').release(),

        /**
         * Managed providers require TLS and present a valid certificate, so
         * the chain is verified. Only disable this against a local server
         * with a self-signed certificate — never against a hosted database.
         */
        ssl: env.get('DB_SSL', true),
      },

      /**
       * Connection pool. Managed free tiers cap concurrent connections
       * aggressively, so the ceiling stays low on purpose.
       */
      pool: {
        min: 0,
        max: env.get('DB_POOL_MAX', 5),
      },

      migrations: {
        /**
         * Sort migration files naturally by filename.
         */
        naturalSort: true,

        /**
         * Paths containing migration files.
         */
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        /**
         * Enable schema generation from Lucid models.
         */
        enabled: true,

        /**
         * Custom schema rules file paths.
         */
        rulesPaths: ['./database/schema_rules.js'],
      },

      debug: app.inDev,
    },
  },
})

export default dbConfig
