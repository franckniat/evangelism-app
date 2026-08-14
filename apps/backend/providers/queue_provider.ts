import queue from '#services/queue'
import queueConfig from '#config/queue'
import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Starts the job queue with the HTTP server and stops it with it.
 *
 * Only in the `web` environment: an ace command should not open a queue
 * connection, register workers and then exit — it would pick up jobs it has
 * no intention of finishing.
 */
export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (!queueConfig.enabled || this.app.getEnvironment() !== 'web') {
      return
    }

    await queue.start()

    const { registerJobs } = await import('#start/jobs')
    await registerJobs()

    logger.info('File de travaux démarrée')
  }

  async shutdown() {
    await queue.stop()
  }
}
