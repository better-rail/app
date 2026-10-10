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

/** A JSON value under one redis key: read, write (with a TTL) and a short in-process read cache. */
const redisJsonKey = <T>(key: string, ttlSec: number, log: { readFailed: string; writeFailed: string }) => {
  let cache: { promise: Promise<T | null>; expiresAt: number } | undefined
  const read = async (): Promise<T | null> => {
    const client = getRedisClient()
    if (!client) return null
    try {
      const raw = await client.get(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch (error) {
      logger?.error(log.readFailed, { error })
      return null
    }
  }
  const write = async (value: T): Promise<void> => {
    const client = getRedisClient()
    if (!client) return
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSec })
    } catch (error) {
      logger?.error(log.writeFailed, { error })
    }
  }
  /** The value for the status derivation, read from redis a few times a minute at most. */
  const get = (): Promise<T | null> => {
    const now = Date.now()
    if (cache && cache.expiresAt > now) return cache.promise
    const promise = read()
    cache = { promise, expiresAt: now + READ_CACHE_TTL_MS }
    return promise
  }
  return { read, write, get }
}

const announcements = redisJsonKey<AnnouncementsState>(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_TTL_SEC, logNames.announcements)
export const readAnnouncementsState = announcements.read
export const writeAnnouncementsState = announcements.write
export const getAnnouncementsState = announcements.get

// --- the timetable check -------------------------------------------------------------

const timetable = redisJsonKey<TimetableCheck>(TIMETABLE_KEY, TIMETABLE_TTL_SEC, logNames.timetableCheck)
export const readTimetableCheck = timetable.read
export const writeTimetableCheck = timetable.write
export const getTimetableCheck = timetable.get
