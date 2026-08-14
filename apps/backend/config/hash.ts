import { defineConfig, drivers } from '@adonisjs/core/hash'

/**
 * Hashing configuration.
 *
 * Passwords are hashed with Argon2id, the variant recommended by OWASP for
 * password storage: it resists both GPU cracking (memory-hard) and
 * side-channel attacks (data-independent first pass).
 *
 * Moisson stores the identities of people who never signed up for it, so a
 * compromised account is a compromised address book. The cost parameters
 * below are the OWASP baseline, not the library defaults.
 */
const hashConfig = defineConfig({
  /**
   * Default hasher used by the application.
   */
  default: 'argon',

  list: {
    argon: drivers.argon2({
      /**
       * Argon2id — the hybrid variant. Do not switch to "i" or "d" without
       * a specific reason: "id" is the one OWASP recommends for passwords.
       */
      variant: 'id',

      /**
       * Memory cost in KiB (Argon2 alias: m).
       * This is what makes parallel GPU attacks expensive.
       *
       * Tuning guideline:
       * - 19456 (19 MiB) is the OWASP baseline paired with iterations=2.
       * - Raise it before raising iterations: memory hurts attackers more.
       * - Remember this much memory is held per concurrent login. Combined
       *   with rate limiting, keep it comfortable for the smallest machine
       *   the API will ever run on.
       */
      memory: 19456,

      /**
       * Number of passes over memory (Argon2 alias: t).
       * The driver rejects values below 2.
       *
       * Tuning guideline:
       * - Benchmark login latency and aim for roughly 100 ms on production
       *   hardware; raise this until you get there.
       */
      iterations: 2,

      /**
       * Parallelism (Argon2 alias: p).
       *
       * Tuning guideline:
       * - Keep 1, as OWASP recommends. Raising it multiplies CPU usage per
       *   login without meaningfully slowing an attacker who is already
       *   parallelising across many candidate passwords.
       */
      parallelism: 1,

      /**
       * Salt size in bytes. 16 is standard; there is no reason to lower it.
       */
      saltSize: 16,

      /**
       * Output length in bytes.
       */
      hashLength: 32,
    }),
  },
})

export default hashConfig

/**
 * Inferring types for the list of hashers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
