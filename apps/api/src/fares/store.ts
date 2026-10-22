/**
 * store.ts — the fares snapshot in KV.
 *
 * The weekly pull (fares/sync.ts) writes it with no expiry: fares change about
 * once a year, and a stale snapshot beats none. The /fares routes read it
 * through a short per-isolate cache, so a request burst costs one KV read a
 * minute. No snapshot means 503 until a pull has run.
 */
import { runtime } from "../runtime"
import { logNames, logger } from "../logs"
import { FarePair, FareSnapshot, pairKey } from "./types"

export const FARES_KEY = "fares:snapshot"

/** Store a snapshot. Throws on a KV failure — the pull must not report success. */
export const writeFareSnapshot = async (snapshot: FareSnapshot): Promise<void> => {
  await runtime().KV.put(FARES_KEY, JSON.stringify(snapshot))
}

/** Uncached read; null when there is no snapshot or KV is unreachable. */
export const readFareSnapshot = async (): Promise<FareSnapshot | null> => {
  try {
    // cacheTtl keeps the edge copy for a minute; the pull is weekly, so that's immaterial.
    return await runtime().KV.get<FareSnapshot>(FARES_KEY, { type: "json", cacheTtl: 60 })
  } catch (error) {
    logger.error(logNames.fares.readFailed, { error })
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

/** Drop the cached read (tests, and right after a pull). */
export const invalidateFareCache = () => {
  cache = undefined
}

export const findFare = (snapshot: FareSnapshot, from: number, to: number): FarePair | null =>
  snapshot.pairs[pairKey(from, to)] ?? null
