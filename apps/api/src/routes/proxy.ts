import { logNames, logger } from "../logs"
import { RailTimetableSearch, railApiFetch } from "../requests/rail-api"
import { searchViaOnRailApi } from "../requests/rail-via"

/**
 * `/rail-api/*` served by proxying the Israel Railways API, the way the server
 * worked before the GTFS migration. Reachable only when `RAIL_DATA_SOURCE=rail`
 * — see routes/rail-api.ts, which picks between this and the GTFS handlers.
 */

/** What the proxy needs from the incoming request. */
export type ProxyRequest = {
  method: string
  /** Path relative to the `/rail-api` mount. */
  path: string
  /** The query string, `?` included (or ""). */
  search: string
  contentType: string | null
  body: unknown
  ip: string | null
  query: Record<string, string | undefined>
}

type Reply = { status: number; body: unknown }

const failed = (error: any, path: string): Reply => {
  // A timed-out upstream is expected now and then, so keep it out of Sentry.
  if (error?.name === "TimeoutError") {
    logger.warn(logNames.railApi.proxy.timedOut, { error, path })
    return { status: 504, body: { error: "Failed to fetch rail data", message: error.message } }
  }

  logger.error(logNames.railApi.proxy.failed, { error, path })
  return { status: 500, body: { error: "Failed to fetch rail data", message: error.message } }
}

/**
 * `hideSlowTrains` is the GTFS planner's own vocabulary, which older app versions
 * send (#710); the rail API has no equivalent, so drop it rather than post it
 * upstream. Newer apps hide slow trains on the device instead.
 */
const withoutServerOnlyParams = (body: unknown) => {
  if (!body || typeof body !== "object") return body
  const { hideSlowTrains, ...rest } = body as Record<string, unknown>
  return rest
}

// Legacy GET `…/timetable/searchTrainLuzForDateTime` (old clients): the upstream
// endpoint is a POST, so the query params are rewritten into its request body.
export const proxySearchTrainRequest = async (req: ProxyRequest): Promise<Reply> => {
  try {
    const { fromStation, toStation, date, hour, scheduleType, systemType, languageId } = req.query

    const response = await railApiFetch("/rjpa/api/v1/timetable/searchTrainForMobile", {
      method: "POST",
      body: JSON.stringify({
        methodName: "searchTrainLuzForDateTime",
        fromStation: parseInt(fromStation as string),
        toStation: parseInt(toStation as string),
        date: date as string,
        hour: hour as string,
        systemType: systemType as string,
        scheduleType: scheduleType === "1" ? "ByDeparture" : "ByArrival",
        languageId: languageId as string,
        requestLocation: '{"latitude":"0.0","longitude":"0.0"}',
        requestIP: req.ip || "147.236.228.2",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
        screenResolution: '{"height":874,"width":402}',
        searchFromFavorites: false,
      }),
    })

    return { status: response.status, body: await response.json() }
  } catch (error: any) {
    return failed(error, req.path)
  }
}

export const railProxy = async (req: ProxyRequest): Promise<Reply> => {
  try {
    // Older app versions call the legacy `searchTrain` endpoint directly, then fall
    // back to this proxy when it returns 403 (it's blocked by Cloudflare's WAF).
    // Transparently rewrite that path to the `searchTrainForMobile` endpoint so
    // already-released clients keep working. Exact match only — a substring replace
    // would turn `searchTrainForMobile` into `searchTrainForMobileForMobile`.
    const path = req.path === "/rjpa/api/v1/timetable/searchTrain" ? "/rjpa/api/v1/timetable/searchTrainForMobile" : req.path

    // Preserve the query string — the GET endpoints (railupdates, station info)
    // depend on `LanguageId`/`SystemType` params, and an old client routes every
    // request through here once it has fallen back to the proxy.
    const response = await railApiFetch(path + req.search, {
      method: req.method,
      headers: { "Content-Type": req.contentType || "application/json" },
      body: req.method !== "GET" ? JSON.stringify(withoutServerOnlyParams(req.body)) : undefined,
    })

    return { status: response.status, body: await response.json() }
  } catch (error: any) {
    return failed(error, req.path)
  }
}

type ViaSearch = { search: RailTimetableSearch; viaStation: number }

// Proxying would drop `viaStation`, so change-station searches go through requests/rail-via.ts.
export const toViaSearch = (body: any): ViaSearch | undefined => {
  const viaStation = Number(body?.viaStation)
  if (!(viaStation > 0)) return undefined

  return {
    viaStation,
    search: {
      fromStation: Number(body.fromStation),
      toStation: Number(body.toStation),
      date: String(body.date),
      hour: String(body.hour),
      scheduleType: body.scheduleType === "ByArrival" ? "ByArrival" : "ByDeparture",
      languageId: String(body.languageId ?? "Hebrew"),
    },
  }
}

export const proxyViaSearch = async ({ search, viaStation }: ViaSearch): Promise<Reply> => {
  try {
    return { status: 200, body: await searchViaOnRailApi(search, viaStation) }
  } catch (error: any) {
    return failed(error, "via search")
  }
}
