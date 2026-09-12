/**
 * state.ts — what the service-status service publishes, shared with the web
 * service via redis (as siri/snapshot.ts is for SIRI): the announced
 * disruptions and the timetable check.
 *
 * The service (its own Railway process) writes the keys; the web service reads
 * them with a short in-process cache and lays them over the lines in
 * status/service-status.ts. No key, no redis, or a stale key all mean "nothing
 * known from that source" — the status is then whatever the others say.
 */
import { getRedisClient } from "../data/redis"
import { logNames, logger } from "../logs"
import type { AnnouncedDisruption } from "./extraction"
import type { TimetableCheck } from "./timetable"

export const ANNOUNCEMENTS_KEY = "status:announcements"
export const TIMETABLE_KEY = "status:timetable"
/** Refreshed every poll; the backstop that clears stale disruptions when the service is gone for good. */
const ANNOUNCEMENTS_TTL_SEC = 3 * 24 * 60 * 60
/** The check is only trusted while fresh (see timetableStaleSeconds); the TTL just tidies up after the service. */
const TIMETABLE_TTL_SEC = 60 * 60
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

export const readAnnouncementsState = async (): Promise<AnnouncementsState | null> => {
  const client = getRedisClient()
  if (!client) return null
  try {
    const raw = await client.get(ANNOUNCEMENTS_KEY)
    return raw ? (JSON.parse(raw) as AnnouncementsState) : null
  } catch (error) {
    logger?.error(logNames.announcements.readFailed, { error })
    return null
  }
}

export const writeAnnouncementsState = async (state: AnnouncementsState): Promise<void> => {
  const client = getRedisClient()
  if (!client) return
  try {
    await client.set(ANNOUNCEMENTS_KEY, JSON.stringify(state), { EX: ANNOUNCEMENTS_TTL_SEC })
  } catch (error) {
    logger?.error(logNames.announcements.writeFailed, { error })
  }
}

let readCache: { promise: Promise<AnnouncementsState | null>; expiresAt: number } | undefined

/** The state for the status derivation, read from redis a few times a minute at most. */
export const getAnnouncementsState = (): Promise<AnnouncementsState | null> => {
  const now = Date.now()
  if (readCache && readCache.expiresAt > now) return readCache.promise
  const promise = readAnnouncementsState()
  readCache = { promise, expiresAt: now + READ_CACHE_TTL_MS }
  return promise
}

// --- the timetable check -------------------------------------------------------------

export const readTimetableCheck = async (): Promise<TimetableCheck | null> => {
  const client = getRedisClient()
  if (!client) return null
  try {
    const raw = await client.get(TIMETABLE_KEY)
    return raw ? (JSON.parse(raw) as TimetableCheck) : null
  } catch (error) {
    logger?.error(logNames.timetableCheck.readFailed, { error })
    return null
  }
}

export const writeTimetableCheck = async (check: TimetableCheck): Promise<void> => {
  const client = getRedisClient()
  if (!client) return
  try {
    await client.set(TIMETABLE_KEY, JSON.stringify(check), { EX: TIMETABLE_TTL_SEC })
  } catch (error) {
    logger?.error(logNames.timetableCheck.writeFailed, { error })
  }
}

let timetableCache: { promise: Promise<TimetableCheck | null>; expiresAt: number } | undefined

/** The latest timetable check for the status derivation, read from redis a few times a minute at most. */
export const getTimetableCheck = (): Promise<TimetableCheck | null> => {
  const now = Date.now()
  if (timetableCache && timetableCache.expiresAt > now) return timetableCache.promise
  const promise = readTimetableCheck()
  timetableCache = { promise, expiresAt: now + READ_CACHE_TTL_MS }
  return promise
}
