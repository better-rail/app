/**
 * station-info.ts — a station's page for GET /api/v1/stations/:stationId/info.
 *
 * The page comes from the Israel Railways API (requests/station-info.ts), in
 * the language asked for, for the app's station card on the network map. It
 * changes rarely (an entrance's hours, a notice), so each is kept in KV for a
 * few hours, and served stale for a day should the API be down; the API is
 * only read when the app asks for a station nobody has asked for lately.
 */
import { logNames, logger } from "../logs"
import { fetchStationInfo } from "../requests/station-info"
import { isRuntimeBound, runtime } from "../runtime"
import type { StationInfo, StationInfoLocale } from "../types/station-info"

/** How long a page is served from KV before the API is read again. */
const FRESH_SECONDS = 6 * 60 * 60
/** How long a page stays in KV at all: the fallback when the API fails. */
const KEEP_SECONDS = 24 * 60 * 60
/** How long a miss (an unknown station) is remembered, so a bad id does not hit the API every time. */
const MISS_SECONDS = 60 * 60

type CacheEntry = { info: StationInfo | null; storedAt: number }

const key = (stationId: string, locale: StationInfoLocale) => `station-info:${stationId}:${locale}`

const kv = () => (isRuntimeBound() ? runtime().KV : undefined)

const readCache = async (stationId: string, locale: StationInfoLocale): Promise<CacheEntry | null> => {
  try {
    return (await kv()?.get<CacheEntry>(key(stationId, locale), "json")) ?? null
  } catch (error) {
    logger.warn(logNames.stationInfo.cacheReadFailed, { stationId, locale, error })
    return null
  }
}

const writeCache = async (stationId: string, locale: StationInfoLocale, entry: CacheEntry) => {
  try {
    await kv()?.put(key(stationId, locale), JSON.stringify(entry), { expirationTtl: entry.info ? KEEP_SECONDS : MISS_SECONDS })
  } catch (error) {
    logger.warn(logNames.stationInfo.cacheWriteFailed, { stationId, locale, error })
  }
}

/** The page: fresh from KV, else from the API (and into KV), else whatever KV still has. */
export const getStationInfo = async (stationId: string, locale: StationInfoLocale): Promise<StationInfo | null> => {
  const cached = await readCache(stationId, locale)
  const fresh = cached !== null && Date.now() - cached.storedAt < (cached.info ? FRESH_SECONDS : MISS_SECONDS) * 1000
  if (cached && fresh) return cached.info

  try {
    const info = await fetchStationInfo(stationId, locale)
    await writeCache(stationId, locale, { info, storedAt: Date.now() })
    return info
  } catch (error) {
    logger.error(logNames.stationInfo.fetchFailed, { stationId, locale, error })
    if (cached) return cached.info
    throw error
  }
}
