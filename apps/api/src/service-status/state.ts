/**
 * state.ts — what the service-status gatherer publishes: the announced
 * disruptions and the timetable check.
 *
 * The gatherer (status-do.ts, a singleton Durable Object) writes them to its
 * own storage; the API reads them over RPC with a short per-isolate cache (as
 * siri/snapshot.ts reads the SIRI poller's snapshot) and lays them over the
 * lines in status/service-status.ts. No gatherer, nothing published yet, or a
 * stale value all mean "nothing known from that source" — the status is then
 * whatever the other sources say.
 */
import { logNames, logger } from "../logs"
import { isRuntimeBound, runtime } from "../runtime"
import type { AnnouncedDisruption } from "./extraction"
import type { TimetableCheck } from "./timetable"

/** The gatherer Durable Object's name — there is exactly one. */
export const STATUS_NAME = "status"

/** Storage keys inside the gatherer. */
export const ANNOUNCEMENTS_KEY = "status:announcements"
export const TIMETABLE_KEY = "status:timetable"

const READ_CACHE_TTL_MS = 10_000

export type AnnouncementsState = {
  /** Of the feed the disruptions came from (see announcements.ts fingerprintOf). */
  fingerprint: string
  /** Real UTC time of the poll behind the state. */
  fetchedAt: string
  /** Real UTC time the model last read the feed (unchanged feeds keep it). */
  extractedAt: string
  model: string
  disruptions: AnnouncedDisruption[]
  /** The feed the disruptions came from, for the debug route. */
  items: { id: string; header: string }[]
}

const gatherer = () => runtime().STATUS.getByName(STATUS_NAME)

/** A value read from the gatherer a few times a minute at most; null outside a Worker or when the read fails. */
const cachedRead = <T>(read: () => Promise<T | null>, log: string) => {
  let cache: { promise: Promise<T | null>; expiresAt: number } | undefined
  return (): Promise<T | null> => {
    const now = Date.now()
    if (cache && cache.expiresAt > now) return cache.promise
    const promise = (async () => {
      if (!isRuntimeBound()) return null
      try {
        return await read()
      } catch (error) {
        logger.error(log, { error })
        return null
      }
    })()
    cache = { promise, expiresAt: now + READ_CACHE_TTL_MS }
    return promise
  }
}

/** The announced disruptions, for the status derivation. */
export const getAnnouncementsState = cachedRead<AnnouncementsState>(
  () => gatherer().getAnnouncements(),
  logNames.announcements.readFailed,
)

/** The latest timetable check, for the status derivation. */
export const getTimetableCheck = cachedRead<TimetableCheck>(
  () => gatherer().getTimetableCheck(),
  logNames.timetableCheck.readFailed,
)
