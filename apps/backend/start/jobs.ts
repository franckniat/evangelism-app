import queue from '#services/queue'
import { PURGE_EXPIRED_TOKENS, purgeExpiredTokens } from '#jobs/purge_expired_tokens'

/**
 * Job handlers and their schedules.
 *
 * Called once the queue is running, not at boot: a handler cannot be attached
 * to a queue that does not exist yet.
 *
 * Workers currently run inside the HTTP process, which is fine at this scale.
 * When volume justifies it, the same registration can be driven from a
 * dedicated worker process without touching the jobs themselves.
 */
export async function registerJobs() {
  await queue.register(PURGE_EXPIRED_TOKENS)
  await queue.process(PURGE_EXPIRED_TOKENS, purgeExpiredTokens)

  /**
   * Every night at 03:15. Off-peak, and late enough not to collide with the
   * evening usage that follows an evangelism outing.
   */
  await queue.schedule(PURGE_EXPIRED_TOKENS, '15 3 * * *')
}
