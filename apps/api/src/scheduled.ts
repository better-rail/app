/**
 * scheduled.ts — the cron triggers (see wrangler.jsonc).
 */
import { runtime } from "./runtime"
import { logNames, logger } from "./logs"
import { POLLER_NAME } from "./siri/snapshot"
import { startIngest } from "./ingest/container"
import { syncFares } from "./fares/sync"

export const CRON_SIRI_WATCHDOG = "* * * * *"
export const CRON_GTFS_INGEST = "30 2 * * *"
export const CRON_FARES_PULL = "0 3 * * 1"

export const runScheduled = async (cron: string) => {
  switch (cron) {
    case CRON_SIRI_WATCHDOG:
      // Re-arms the poller's alarm loop if it ever stopped; a no-op while it runs.
      await runtime().SIRI.getByName(POLLER_NAME).ensureRunning()
      return
    case CRON_GTFS_INGEST:
      logger.info(logNames.server.cron, { cron, job: "gtfs-ingest", ...(await startIngest()) })
      return
    case CRON_FARES_PULL:
      logger.info(logNames.server.cron, { cron, job: "fares-pull", ...(await syncFares()) })
      return
    default:
      logger.warn(logNames.server.cron, { cron, job: "unknown" })
  }
}
