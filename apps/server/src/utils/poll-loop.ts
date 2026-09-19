/**
 * poll-loop.ts — a background cycle that repeats itself: setTimeout-chaining,
 * never setInterval, so cycles cannot overlap; failures back off exponentially
 * up to a cap, and only the transitions are logged (the first failure and the
 * recovery), so a long outage does not fill the log.
 */
import { logger } from "../logs"

export type PollLoop = {
  /** Start the loop; a second call is a no-op. */
  start: () => void
}

export const createPollLoop = (options: {
  /** One cycle; whatever it resolves to is logged with the recovery. */
  run: () => Promise<unknown>
  everyMs: number
  maxBackoffMs: number
  /** How long after `start` the first cycle runs. */
  initialDelayMs?: number
  log: { failed: string; recovered: string }
}): PollLoop => {
  const { run, everyMs, maxBackoffMs, initialDelayMs = 0, log } = options
  let started = false
  let failures = 0

  const cycle = async () => {
    let delayMs = everyMs
    try {
      const summary = await run()
      if (failures > 0) {
        logger?.info(log.recovered, { afterFailures: failures, ...(typeof summary === "object" && summary ? summary : {}) })
      }
      failures = 0
    } catch (error) {
      failures += 1
      if (failures === 1) logger?.error(log.failed, { error })
      delayMs = Math.min(everyMs * 2 ** failures, maxBackoffMs)
    }
    setTimeout(cycle, delayMs)
  }

  return {
    start: () => {
      if (started) return
      started = true
      setTimeout(cycle, initialDelayMs)
    },
  }
}
