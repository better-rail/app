/**
 * service-status.ts — the status screens' read-only routes.
 *
 * - GET /service-status: the network's health per line (status/service-status.ts) — the
 *   timetable in D1 laid over with the SIRI snapshot and the gatherer's announcements and
 *   timetable check, both read over RPC. No feed degrades to a 503 rather than a hang.
 * - GET /stations/:stationId/departures: the next trains calling at a station, per line
 *   and direction (status/departures.ts); 404 for a station the catalogue does not know.
 * - GET /stations/:stationId/info?locale=he: the station's page from the Israel Railways
 *   API, cached in KV (station-info.ts); 503 while the rail API is unset.
 *
 * All three are short-lived cacheable.
 */
import { Elysia } from "elysia"

import { stationsObject } from "../data/stations"
import { logNames, logger } from "../logs"
import { isRailApiConfigured } from "../requests/rail-api"
import { getStationDepartures } from "../status/departures"
import { getServiceStatus } from "../status/service-status"
import type { StationInfoLocale } from "../types/station-info"
import { createRateLimiter } from "../utils/rate-limiter"
import { json, rateLimited } from "./helpers"
import { getStationInfo } from "./station-info"

const LOCALES: StationInfoLocale[] = ["he", "en", "ru", "ar"]
const toLocale = (value: unknown): StationInfoLocale =>
  LOCALES.includes(value as StationInfoLocale) ? (value as StationInfoLocale) : "he"

const statusLimiter = createRateLimiter(60 * 1000, 60)
const stationsLimiter = createRateLimiter(60 * 1000, 120)

export const serviceStatusRoutes = new Elysia()
  .get(
    "/service-status",
    async (ctx) => {
      try {
        const status = await getServiceStatus()
        if (!status) return json(ctx, 503, { error: "Service status unavailable" })
        ctx.set.headers["cache-control"] = "public, max-age=15"
        return status
      } catch (error) {
        logger.error(logNames.serviceStatus.failed, { error })
        return json(ctx, 500, { error: "Failed to compute service status" })
      }
    },
    { beforeHandle: rateLimited(statusLimiter) },
  )
  .get(
    "/stations/:stationId/departures",
    async (ctx) => {
      const { stationId } = ctx.params
      if (!stationsObject[stationId]) return json(ctx, 404, { error: "Unknown station" })
      try {
        const departures = await getStationDepartures(stationId)
        if (!departures) return json(ctx, 503, { error: "Departures unavailable" })
        ctx.set.headers["cache-control"] = "public, max-age=10"
        return departures
      } catch (error) {
        logger.error(logNames.stationDepartures.failed, { stationId, error })
        return json(ctx, 500, { error: "Failed to compute departures" })
      }
    },
    { beforeHandle: rateLimited(stationsLimiter) },
  )
  .get(
    "/stations/:stationId/info",
    async (ctx) => {
      if (!isRailApiConfigured()) return json(ctx, 503, { error: "Station information unavailable" })

      // Only stations the app knows: the API answers an unknown id with a 500, not a 404.
      const { stationId } = ctx.params
      if (!stationsObject[stationId]) return json(ctx, 404, { error: "Unknown station" })
      const locale = toLocale(ctx.query.locale)

      try {
        const info = await getStationInfo(stationId, locale)
        if (!info) return json(ctx, 404, { error: "Unknown station" })
        ctx.set.headers["cache-control"] = "public, max-age=900"
        return info
      } catch {
        return json(ctx, 502, { error: "Failed to fetch station information" })
      }
    },
    { beforeHandle: rateLimited(stationsLimiter) },
  )
