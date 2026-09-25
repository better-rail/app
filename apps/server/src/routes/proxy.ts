import { Request, Response } from "express"

import { logNames, logger } from "../logs"
import { apiContractV1 } from "../data/config"
import { ApiError, getRequestId, sendApiError, toApiError } from "../api-error"
import { hasProviderApplicationError, isRailTimeoutError, RailTimetableSearch, railApiFetch } from "../requests/rail-api"
import { searchViaOnRailApi } from "../requests/rail-via"

/**
 * `/rail-api/*` served by proxying the Israel Railways API, the way the server
 * worked before the GTFS migration. Reachable only when `RAIL_DATA_SOURCE=rail`
 * — see routes/rail-api.ts, which picks between this and the GTFS handlers.
 */

const failed = (res: Response, error: unknown) => {
  const input = toApiError(error)
  logger?.error(logNames.railApi.proxy.failed, { code: input.code, requestId: getRequestId(res) })
  sendApiError(res, {
    ...input,
    legacy: { error: "Failed to fetch rail data" },
  })
}

/**
 * `hideSlowTrains` is the GTFS planner's own vocabulary — the app started sending
 * it (#710) once the timetable was already served in-house, so the rail API has
 * never seen the field and has no equivalent of it. Drop it rather than post an
 * undefined member upstream; the toggle is simply inert while this source is
 * selected, since the rail API returns its own curated shortlist of itineraries.
 */
const upstreamError = () =>
  new ApiError({ status: 502, code: "UPSTREAM_UNAVAILABLE", message: "Rail data is temporarily unavailable", retryable: true })

const parseUpstreamJson = async (response: globalThis.Response): Promise<unknown> => {
  if (!response.ok && apiContractV1) throw upstreamError()
  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    if (isRailTimeoutError(error)) {
      throw new ApiError({ status: 504, code: "UPSTREAM_TIMEOUT", message: "The rail data service timed out", retryable: true })
    }
    throw new ApiError({
      status: 502,
      code: "UPSTREAM_INVALID_RESPONSE",
      message: "Rail data returned an invalid response",
      retryable: true,
    })
  }
  if (apiContractV1 && hasProviderApplicationError(data)) throw upstreamError()
  return data
}

const withoutServerOnlyParams = (body: unknown) => {
  if (!body || typeof body !== "object") return body
  const { hideSlowTrains, ...rest } = body as Record<string, unknown>
  return rest
}

// Legacy GET `…/timetable/searchTrainLuzForDateTime` (old clients): the upstream
// endpoint is a POST, so the query params are rewritten into its request body.
const proxySearchTrainRequest = async (req: Request, res: Response) => {
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

    const data = await parseUpstreamJson(response)
    res.status(response.status).json(data)
  } catch (error: unknown) {
    failed(res, error)
  }
}

const railProxy = async (req: Request, res: Response) => {
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
    const queryIndex = req.url.indexOf("?")
    const search = queryIndex === -1 ? "" : req.url.slice(queryIndex)

    const response = await railApiFetch(path + search, {
      method: req.method,
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
      body: req.method !== "GET" ? JSON.stringify(withoutServerOnlyParams(req.body)) : undefined,
    })

    const data = await parseUpstreamJson(response)
    res.status(response.status).json(data)
  } catch (error: unknown) {
    failed(res, error)
  }
}

type ViaSearch = { search: RailTimetableSearch; viaStation: number }

// Proxying would drop `viaStation`, so change-station searches go through requests/rail-via.ts.
const toViaSearch = (body: any): ViaSearch | undefined => {
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

const proxyViaSearch = async (res: Response, { search, viaStation }: ViaSearch) => {
  try {
    res.status(200).json(await searchViaOnRailApi(search, viaStation))
  } catch (error: unknown) {
    failed(res, error)
  }
}

export { railProxy, proxySearchTrainRequest, proxyViaSearch, toViaSearch }
