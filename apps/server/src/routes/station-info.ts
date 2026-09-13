/**
 * station-info.ts — GET /api/v1/stations/:stationId/info?locale=he
 *
 * A station's page from the Israel Railways API (requests/station-info.ts), in
 * the language asked for, for the app's station card on the network map. The
 * page changes rarely (an entrance's hours, a notice), so each is kept in redis
 * for a few hours, and served stale for a day should the API be down; the API
 * is only read when the app asks for a station nobody has asked for lately.
 * Answers 503 when RAIL_URL / RAIL_API_KEY are unset, and 404 for a station id
 * the app's catalogue does not know (the API answers those with a 500).
 */
import { Request, Response } from "express"

import { getRedisClient } from "../data/redis"
import { stationsObject } from "../data/stations"
import { logNames, logger } from "../logs"
import { isRailApiConfigured } from "../requests/rail-api"
import { fetchStationInfo } from "../requests/station-info"
import type { StationInfo, StationInfoLocale } from "../types/station-info"

/** How long a page is served from redis before the API is read again. */
const FRESH_SECONDS = 6 * 60 * 60
/** How long a page stays in redis at all: the fallback when the API fails. */
const KEEP_SECONDS = 24 * 60 * 60
/** How long a miss (an unknown station) is remembered, so a bad id does not hit the API every time. */
const MISS_SECONDS = 60 * 60

const LOCALES: StationInfoLocale[] = ["he", "en", "ru", "ar"]

type CacheEntry = { info: StationInfo | null; storedAt: number }

const key = (stationId: string, locale: StationInfoLocale) => `station-info:${stationId}:${locale}`

const readCache = async (stationId: string, locale: StationInfoLocale): Promise<CacheEntry | null> => {
  try {
    const raw = await getRedisClient()?.get(key(stationId, locale))
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch (error) {
    logger?.warn(logNames.stationInfo.cacheReadFailed, { stationId, locale, error })
    return null
  }
}

const writeCache = async (stationId: string, locale: StationInfoLocale, entry: CacheEntry) => {
  try {
    await getRedisClient()?.set(key(stationId, locale), JSON.stringify(entry), { EX: entry.info ? KEEP_SECONDS : MISS_SECONDS })
  } catch (error) {
    logger?.warn(logNames.stationInfo.cacheWriteFailed, { stationId, locale, error })
  }
}

/** The page: fresh from redis, else from the API (and into redis), else whatever redis still has. */
export const getStationInfo = async (stationId: string, locale: StationInfoLocale): Promise<StationInfo | null> => {
  const cached = await readCache(stationId, locale)
  const fresh = cached !== null && Date.now() - cached.storedAt < (cached.info ? FRESH_SECONDS : MISS_SECONDS) * 1000
  if (cached && fresh) return cached.info

  try {
    const info = await fetchStationInfo(stationId, locale)
    await writeCache(stationId, locale, { info, storedAt: Date.now() })
    return info
  } catch (error) {
    logger?.error(logNames.stationInfo.fetchFailed, { stationId, locale, error })
    if (cached) return cached.info
    throw error
  }
}

const toLocale = (value: unknown): StationInfoLocale =>
  LOCALES.includes(value as StationInfoLocale) ? (value as StationInfoLocale) : "he"

export const handleStationInfoRequest = async (req: Request, res: Response) => {
  if (!isRailApiConfigured()) return res.status(503).json({ error: "Station information unavailable" })

  // Only stations the app knows: the API answers an unknown id with a 500, not a 404.
  const stationId = String(req.params.stationId ?? "")
  if (!stationsObject[stationId]) return res.status(404).json({ error: "Unknown station" })
  const locale = toLocale(req.query.locale)

  try {
    const info = await getStationInfo(stationId, locale)
    if (!info) return res.status(404).json({ error: "Unknown station" })
    res.setHeader("Cache-Control", "public, max-age=900")
    return res.status(200).json(info)
  } catch (error) {
    return res.status(502).json({ error: "Failed to fetch station information" })
  }
}
