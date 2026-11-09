import { ScheduleType } from "./gtfs-route-api"
import { RailApiGetRoutesResult } from "../types/rail-response"
import { config } from "../config"
import { egressFetch } from "../utils/egress"

/**
 * The Israel Railways API — the data source the server used before the GTFS
 * migration, reachable again behind `RAIL_DATA_SOURCE=rail`, and the source of
 * the fares snapshot.
 *
 * Reachable from a Worker directly — but only with a User-Agent: rail.co.il sits
 * behind Cloudflare's WAF, which answers a request without one with an HTML
 * challenge page, and a Worker's fetch sends none by default. (Verified from a
 * deployed Worker, October 2026: the same request with any User-Agent gets JSON.)
 * The egress proxy (utils/egress.ts) is therefore not involved unless it is
 * configured to relay this host too.
 */

/** Sent on every rail API request; the WAF in front of rail.co.il rejects a request without one. */
export const RAIL_API_USER_AGENT = "better-rail-api/2.0 (+https://better-rail.co.il)"

export const isRailApiConfigured = () => Boolean(config.railUrl && config.railApiKey)

// Fail fast when the API hangs, before the client gives up.
const RAIL_API_TIMEOUT_MS = 10_000

type RailFetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string
  /** Extra attempts after a network error or a 5xx, with exponential backoff. */
  retries?: number
  /** Deadline for the whole call, retries and body read included. */
  timeoutMs?: number
}

/** `path` is appended to RAIL_URL as-is, query string included. */
export const railApiFetch = async (path: string, options: RailFetchOptions = {}): Promise<Response> => {
  if (!isRailApiConfigured()) {
    throw new Error("RAIL_DATA_SOURCE is 'rail' but RAIL_URL / RAIL_API_KEY are unset")
  }

  const { method = "GET", headers, body, retries = 0, timeoutMs = RAIL_API_TIMEOUT_MS } = options
  // A timer this call clears, not AbortSignal.timeout(): that one cannot be cancelled, and a Durable Object stays
  // awake (and billed) until its pending timers fire, so every ride tick was held open for the whole deadline.
  const controller = new AbortController()
  const { signal } = controller
  const deadline = setTimeout(
    () => controller.abort(new DOMException("The Israel Railways API request timed out", "TimeoutError")),
    timeoutMs,
  )
  const init: RequestInit = {
    method,
    body,
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": RAIL_API_USER_AGENT,
      ...headers,
      "Ocp-Apim-Subscription-Key": config.railApiKey,
    },
  }

  try {
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100))

      try {
        const response = await egressFetch(`${config.railUrl}${path}`, init)
        // Only server-side failures are worth another attempt; a 4xx would repeat.
        if (response.status >= 500 && attempt < retries) continue
        return await buffered(response)
      } catch (error) {
        lastError = error
        if (signal.aborted) break
      }
    }

    throw lastError ?? new Error("Failed to reach the Israel Railways API")
  } finally {
    clearTimeout(deadline)
  }
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304])

/** The response with its body already read, so the deadline covers the read and can be cleared before the caller parses it. */
const buffered = async (response: Response): Promise<Response> => {
  const body = NULL_BODY_STATUSES.has(response.status) ? null : await response.arrayBuffer()
  const headers = new Headers(response.headers)
  // The buffered bytes are already decoded; the upstream's framing headers no longer describe them.
  headers.delete("content-encoding")
  headers.delete("content-length")
  return new Response(body, { status: response.status, statusText: response.statusText, headers })
}

export type RailTimetableSearch = {
  fromStation: number
  toStation: number
  date: string
  hour: string
  scheduleType: ScheduleType
  languageId: string
}

/** A timetable search, in the API's own request shape. */
export const searchTimetableOnRailApi = async (search: RailTimetableSearch): Promise<RailApiGetRoutesResult> => {
  const response = await railApiFetch("/rjpa/api/v1/timetable/searchTrainForMobile", {
    method: "POST",
    retries: 2,
    body: JSON.stringify({ methodName: "searchTrainLuzForDateTime", systemType: "1", ...search }),
  })

  if (!response.ok) {
    throw new Error(`Israel Railways API responded with ${response.status}`)
  }

  return (await response.json()) as RailApiGetRoutesResult
}
