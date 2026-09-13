/**
 * store.ts — the fares snapshot in redis.
 *
 * `bun run rail:pull` writes it (no TTL: fares change about once a year, and
 * a stale snapshot beats none); the /fares routes read it through a short
 * in-process cache, so a request burst costs one redis read a minute. The web
 * service never calls the rail API itself — no snapshot means 503 until a pull
 * has run.
 */
import { getRedisClient } from "../data/redis"
import { logNames, logger } from "../logs"
import { FarePair, FareSnapshot, pairKey } from "./types"

export const FARES_KEY = "fares:snapshot"

/** Store a snapshot. Throws on a redis failure — the pull must not report success. */
export const writeFareSnapshot = async (snapshot: FareSnapshot): Promise<void> => {
  const client = getRedisClient()
  if (!client) throw new Error("Redis is not connected")
  await client.set(FARES_KEY, JSON.stringify(snapshot))
}

/** Uncached read; null when there is no snapshot or redis is unreachable. */
export const readFareSnapshot = async (): Promise<FareSnapshot | null> => {
  try {
    const raw = await getRedisClient()?.get(FARES_KEY)
    return raw ? (JSON.parse(raw) as FareSnapshot) : null
  } catch (error) {
    logger?.error(logNames.fares.readFailed, { error })
    return null
  }
}

// Same pattern as the SIRI snapshot: cache the in-flight promise for a window.
// A missing snapshot is cached briefly so a fresh pull shows up within seconds.
const CACHE_TTL_MS = 60_000
const MISSING_TTL_MS = 5_000
let cache: { promise: Promise<FareSnapshot | null>; expiresAt: number } | undefined

export const getFareSnapshot = (): Promise<FareSnapshot | null> => {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.promise
  const promise = readFareSnapshot()
  const entry = { promise, expiresAt: now + CACHE_TTL_MS }
  cache = entry
  promise.then((snapshot) => {
    if (!snapshot && cache === entry) cache = { promise, expiresAt: now + MISSING_TTL_MS }
  })
  return promise
}

/** Drop the cached read (tests). */
export const invalidateFareCache = () => {
  cache = undefined
}

export const findFare = (snapshot: FareSnapshot, from: number, to: number): FarePair | null =>
  snapshot.pairs[pairKey(from, to)] ?? null
