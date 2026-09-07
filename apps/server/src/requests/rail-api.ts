import { ScheduleType } from "./gtfs-route-api"
import { RailApiGetRoutesResult } from "../types/rail-response"
import { LanguageCode, railApiLocales } from "../locales/i18n"
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
    throw new Error("RAIL_DATA_SOURCE is 'rail' but RAIL_URL / RAIL_API_KEY are unset")
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

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100))

    try {
      const response = await fetch(`${railUrl}${path}`, init)
      // Only server-side failures are worth another attempt; a 4xx would repeat.
      if (response.status >= 500 && attempt < retries) continue
      return response
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error("Failed to reach the Israel Railways API")
}

/** The timetable search the ride scheduler runs, in the API's own request shape. */
export const searchTrainOnRailApi = async (
  fromStation: number,
  toStation: number,
  date: string,
  hour: string,
  scheduleType: ScheduleType = "ByDeparture",
  locale: LanguageCode = LanguageCode.he,
): Promise<RailApiGetRoutesResult> => {
  const response = await railApiFetch("/rjpa/api/v1/timetable/searchTrainForMobile", {
    method: "POST",
    retries: 2,
    body: JSON.stringify({
      methodName: "searchTrainLuzForDateTime",
      fromStation,
      toStation,
      date,
      hour,
      systemType: "1",
      scheduleType,
      languageId: railApiLocales[locale],
    }),
  })

  if (!response.ok) {
    throw new Error(`Israel Railways API responded with ${response.status}`)
  }

  return (await response.json()) as RailApiGetRoutesResult
}
