import { PgBoss } from 'pg-boss'
import type { Job } from 'pg-boss'
import queueConfig from '#config/queue'
import logger from '@adonisjs/core/services/logger'

/**
 * Thin façade over the job queue.
 *
 * Everything the application does goes through these four methods, so the
 * engine underneath stays replaceable. If the project ever moves to Redis and
 * BullMQ, this file changes and the jobs do not.
 */
class Queue {
  #boss: PgBoss | null = null

  get #instance() {
    if (!this.#boss) {
      throw new Error('La file de travaux n’est pas démarrée')
    }

    return this.#boss
  }

  get isRunning() {
    return this.#boss !== null
  }

  async start() {
    if (this.#boss) {
      return
    }

    const boss = new PgBoss({
      connectionString: queueConfig.connectionString,
      ssl: queueConfig.ssl,
      schema: queueConfig.schema,
    })

    boss.on('error', (error: Error) => {
      logger.error({ err: error }, 'Erreur de la file de travaux')
    })

    await boss.start()
    this.#boss = boss
  }

  async stop() {
    if (!this.#boss) {
      return
    }

    await this.#boss.stop({ graceful: true })
    this.#boss = null
  }

  /**
   * Queues must exist before anything is sent to them or read from them.
   */
  async register(name: string) {
    await this.#instance.createQueue(name)
  }

  /**
   * Hand a job over. Returns once it is durably stored, not once it has run.
   */
  async dispatch(name: string, data: object = {}) {
    return this.#instance.send(name, data, {
      retryLimit: queueConfig.retryLimit,
      retryBackoff: queueConfig.retryBackoff,
      retryDelay: queueConfig.retryDelay,
    })
  }

  /**
   * Attach a handler. A handler that throws sends the job back for retry.
   */
  async process<T extends object>(name: string, handler: (data: T) => Promise<unknown>) {
    await this.#instance.work<T>(name, async (jobs: Job<T>[]) => {
      for (const job of jobs) {
        await handler(job.data)
      }
    })
  }

  /**
   * Recurring work, expressed as cron. Re-scheduling the same name replaces
   * the previous entry, so changing a cadence is just an edit.
   */
  async schedule(name: string, cron: string, data: object = {}) {
    await this.#instance.schedule(name, cron, data, {
      retryLimit: queueConfig.retryLimit,
      retryBackoff: queueConfig.retryBackoff,
    })
  }
}

export default new Queue()
