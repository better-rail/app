import { ApiError } from "../api-error"
import { ScheduleType } from "./gtfs-route-api"
import { RailApiGetRoutesResult } from "../types/rail-response"
import { proxyUrl, railApiKey, railTlsInsecure, railUrl } from "../data/config"

/**
 * The Israel Railways API — the data source the server used before the GTFS
 * migration, reachable again behind `RAIL_DATA_SOURCE=rail`.
 *
 * The API is geo-fenced, so a deployment whose egress IP isn't in Israel has to
 * tunnel through `PROXY_URL`. Bun takes the proxy (and the TLS overrides) per
 * `fetch` call, so unlike the old axios client there is no shared agent to keep
 * alive and no process-wide TLS switch.
 */

export const isRailApiConfigured = () => Boolean(railUrl && railApiKey)

const RAIL_API_TIMEOUT_MS = 8_000
export const isRailTimeoutError = (error: unknown) =>
  error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || /timed? ?out/i.test(error.message))

type RailFetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string
  /** Extra attempts after a network error or a 5xx, with exponential backoff. */
  retries?: number
}

/** `path` is appended to RAIL_URL as-is, query string included. */
export const railApiFetch = async (path: string, options: RailFetchOptions = {}): Promise<Response> => {
  if (!isRailApiConfigured()) {
    throw new ApiError({
      status: 503,
      code: "UPSTREAM_UNAVAILABLE",
      message: "Rail data service is not configured",
      retryable: false,
    })
  }

  const { method = "GET", headers, body, retries = 0 } = options
  const init = {
    method,
    body,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
      "Ocp-Apim-Subscription-Key": railApiKey,
    },
    proxy: proxyUrl || undefined,
    tls: railTlsInsecure ? { rejectUnauthorized: false } : undefined,
  }

  let lastError: ApiError | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100))

    try {
      const response = await fetch(`${railUrl}${path}`, { ...init, signal: AbortSignal.timeout(RAIL_API_TIMEOUT_MS) })
      if (response.status >= 500) {
        await response.body?.cancel()
        if (attempt < retries) continue
        throw new ApiError({
          status: 502,
          code: "UPSTREAM_UNAVAILABLE",
          message: "Rail data is temporarily unavailable",
          retryable: true,
        })
      }
      return response
    } catch (error) {
      lastError =
        error instanceof ApiError
          ? error
          : new ApiError({
              status: isRailTimeoutError(error) ? 504 : 502,
              code: isRailTimeoutError(error) ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
              message: isRailTimeoutError(error) ? "The rail data service timed out" : "Rail data is temporarily unavailable",
              retryable: true,
            })
    }
  }

  throw (
    lastError ??
    new ApiError({ status: 502, code: "UPSTREAM_UNAVAILABLE", message: "Rail data is temporarily unavailable", retryable: true })
  )
}

export type RailTimetableSearch = {
  fromStation: number
  toStation: number
  date: string
  hour: string
  scheduleType: ScheduleType
  languageId: string
}

export const hasProviderApplicationError = (value: unknown) => {
  if (!value || typeof value !== "object") return false
  const record = value as { successStatus?: unknown; errorMessages?: unknown }
  if (record.successStatus !== undefined && record.successStatus !== 1 && record.successStatus !== "1") return true
  if (record.errorMessages !== undefined && record.errorMessages !== null) {
    if (Array.isArray(record.errorMessages)) return record.errorMessages.length > 0
    if (record.errorMessages === "") return false
    return true
  }
  return false
}

const isRailApiResult = (value: unknown): value is RailApiGetRoutesResult => {
  if (!value || typeof value !== "object") return false
  const result = (value as { result?: unknown }).result
  return Boolean(result && typeof result === "object" && Array.isArray((result as { travels?: unknown }).travels))
}

/** A timetable search, in the API's own request shape. */
export const searchTimetableOnRailApi = async (search: RailTimetableSearch): Promise<RailApiGetRoutesResult> => {
  const response = await railApiFetch("/rjpa/api/v1/timetable/searchTrainForMobile", {
    method: "POST",
    retries: 2,
    body: JSON.stringify({ methodName: "searchTrainLuzForDateTime", systemType: "1", ...search }),
  })

  if (!response.ok) {
    throw new ApiError({
      status: 502,
      code: "UPSTREAM_UNAVAILABLE",
      message: "Rail data is temporarily unavailable",
      retryable: true,
    })
  }

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
  if (!isRailApiResult(data) || hasProviderApplicationError(data)) {
    throw new ApiError({
      status: 502,
      code: "UPSTREAM_INVALID_RESPONSE",
      message: "Rail data returned an invalid response",
      retryable: true,
    })
  }
  return data
}
