import { Elysia } from "elysia"

import { logNames, logger } from "../logs"
import { config } from "../config"
import { ProxyRequest, proxySearchTrainRequest, proxyViaSearch, railProxy, toViaSearch } from "./proxy"
import { searchTrain, ScheduleType } from "../requests/gtfs-route-api"
import { createRateLimiter } from "../utils/rate-limiter"
import { json, jsonBody, mountedPath, rateLimited } from "./helpers"

const toScheduleType = (value: unknown): ScheduleType =>
  value === "ByArrival" || value === 2 || value === "2" ? "ByArrival" : "ByDeparture"

const toFlag = (value: unknown): boolean => value === true || value === "true" || value === 1 || value === "1"

type Reply = { status: number; body: unknown }

// Run a GTFS-backed timetable search and reply with the emulated
// `{ result: { travels } }` shape the Israel Railways API used to return.
// `hideSlowTrains` is the app's "hide slow trains" toggle; absent (widgets, old
// clients) every direct train is listed.
const runTimetableSearch = async (params: {
  fromStation: unknown
  toStation: unknown
  date: unknown
  hour: unknown
  scheduleType: unknown
  hideSlowTrains?: unknown
  viaStation?: unknown
}): Promise<Reply> => {
  try {
    const viaStation = Number(params.viaStation)
    const result = await searchTrain(
      Number(params.fromStation),
      Number(params.toStation),
      String(params.date),
      String(params.hour),
      toScheduleType(params.scheduleType),
      {
        hideSlowTrains: toFlag(params.hideSlowTrains),
        viaStation: viaStation > 0 ? viaStation : undefined,
      },
    )
    return { status: 200, body: result }
  } catch (error: any) {
    logger.error(logNames.gtfs.search.failed, { error })
    return { status: 500, body: { error: "Failed to fetch rail data", message: error.message } }
  }
}

const isTimetableSearchPath = (path: string) =>
  path.endsWith("/timetable/searchTrainForMobile") || path.endsWith("/timetable/searchTrain")

// The response envelope the Israel Railways API wrapped every payload in.
// Retired endpoints keep answering with it (empty) so shipped clients render
// "no data" instead of erroring.
export const legacyEnvelope = (result: unknown) => ({
  creationDate: new Date().toISOString(),
  version: "1",
  successStatus: 1,
  statusCode: 200,
  errorMessages: null,
  result,
})

const MOUNT = "/api/v1/rail-api"

const toProxyRequest = (request: Request, body: unknown, query: Record<string, string | undefined>): ProxyRequest => {
  const { path, search } = mountedPath(request, MOUNT)
  return {
    method: request.method,
    path,
    search,
    contentType: request.headers.get("content-type"),
    body,
    ip: request.headers.get("cf-connecting-ip"),
    query,
  }
}

const railApiLimiter = createRateLimiter(10 * 60 * 1000, 1000)
const searchTrainLimiter = createRateLimiter(10 * 60 * 1000, 1000)

export const railApiRoutes = new Elysia()
  // Legacy GET `…/timetable/searchTrainLuzForDateTime` (old clients).
  // scheduleType arrives as "1" (ByDeparture) / "2" (ByArrival).
  .get(
    "/rail-api/rjpa/api/v1/timetable/searchTrainLuzForDateTime",
    async (ctx) => {
      if (config.railDataSource === "rail") {
        const reply = await proxySearchTrainRequest(toProxyRequest(ctx.request, undefined, ctx.query))
        return json(ctx, reply.status, reply.body)
      }

      const { fromStation, toStation, date, hour, scheduleType, hideSlowTrains, viaStation } = ctx.query
      const reply = await runTimetableSearch({
        fromStation,
        toStation,
        date,
        hour,
        scheduleType: scheduleType === "1" ? "ByDeparture" : "ByArrival",
        hideSlowTrains,
        viaStation,
      })
      return json(ctx, reply.status, reply.body)
    },
    { beforeHandle: rateLimited(searchTrainLimiter) },
  )
  /**
   * `/rail-api/*` — the legacy Israel Railways API surface.
   *
   * Under `RAIL_DATA_SOURCE=gtfs` (the default) it's served in-house: the timetable
   * search endpoints run on GTFS/D1, and everything else (railupdates,
   * PopUpMessages, station info) is retired and answers with an empty legacy
   * envelope. Under `RAIL_DATA_SOURCE=rail` every path proxies upstream instead,
   * except change-station searches, which the rail API can't answer on its own.
   */
  .all(
    "/rail-api/*",
    async (ctx) => {
      const { path } = mountedPath(ctx.request, MOUNT)
      const method = ctx.request.method
      const body = jsonBody(ctx.body)

      if (config.railDataSource === "rail") {
        const viaSearch = method === "POST" && isTimetableSearchPath(path) ? toViaSearch(body) : undefined
        const reply = viaSearch ? await proxyViaSearch(viaSearch) : await railProxy(toProxyRequest(ctx.request, body, ctx.query))
        return json(ctx, reply.status, reply.body)
      }

      if (method === "POST" && isTimetableSearchPath(path)) {
        const { fromStation, toStation, date, hour, scheduleType, hideSlowTrains, viaStation } = body
        const reply = await runTimetableSearch({ fromStation, toStation, date, hour, scheduleType, hideSlowTrains, viaStation })
        return json(ctx, reply.status, reply.body)
      }

      // Station info is an object result in shipped clients (its screen crashes on
      // an array), so it gets null; the list endpoints get [].
      const result = path.includes("/Stations/GetStationInformation") ? null : []
      return json(ctx, 200, legacyEnvelope(result))
    },
    { beforeHandle: rateLimited(railApiLimiter) },
  )
