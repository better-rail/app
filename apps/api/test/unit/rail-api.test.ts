import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { RAIL_API_USER_AGENT, railApiFetch } from "../../src/requests/rail-api"
import { isRelayedHost } from "../../src/utils/egress"

const realFetch = globalThis.fetch
let calls: { url: string; init: RequestInit }[] = []

beforeEach(() => {
  calls = []
  process.env.RAIL_URL = "https://rail-api.rail.co.il"
  process.env.RAIL_API_KEY = "key"
  process.env.SIRI_URL = "https://moran.mot.gov.il/Channels/HTTPChannel/SmQuery/2.8"
  delete process.env.EGRESS_PROXY_URL
  delete process.env.EGRESS_PROXY_RELAY_RAIL
  globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return Response.json({ ok: true })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

test("rail API requests carry a User-Agent and the subscription key (rail.co.il's WAF rejects a request without one)", async () => {
  await railApiFetch("/common/api/v1/railupdates/?LanguageId=Hebrew")
  expect(calls).toHaveLength(1)
  expect(calls[0].url).toBe("https://rail-api.rail.co.il/common/api/v1/railupdates/?LanguageId=Hebrew")
  const headers = calls[0].init.headers as Record<string, string>
  expect(headers["User-Agent"]).toBe(RAIL_API_USER_AGENT)
  expect(headers["Ocp-Apim-Subscription-Key"]).toBe("key")
})

test("only the SIRI host is relayed through the egress proxy unless the rail relay is switched on", () => {
  expect(isRelayedHost("https://moran.mot.gov.il/Channels/HTTPChannel/SmQuery/2.8/json?Key=x")).toBe(true)
  expect(isRelayedHost("https://rail-api.rail.co.il/rjpa/api/v1/timetable/searchTrainForMobile")).toBe(false)
  process.env.EGRESS_PROXY_RELAY_RAIL = "true"
  expect(isRelayedHost("https://rail-api.rail.co.il/rjpa/api/v1/timetable/searchTrainForMobile")).toBe(true)
})

test("the deadline timer is cleared once the response is read (a pending timer keeps a Durable Object awake and billed)", async () => {
  const pending = new Set<unknown>()
  const realSetTimeout = globalThis.setTimeout
  const realClearTimeout = globalThis.clearTimeout
  const realAbortTimeout = AbortSignal.timeout
  const abortTimeout = mock(realAbortTimeout)
  globalThis.setTimeout = ((handler: () => void, ms?: number) => {
    const id = realSetTimeout(() => {
      pending.delete(id)
      handler()
    }, ms)
    pending.add(id)
    return id
  }) as typeof setTimeout
  globalThis.clearTimeout = ((id: Parameters<typeof clearTimeout>[0]) => {
    pending.delete(id)
    realClearTimeout(id)
  }) as typeof clearTimeout
  AbortSignal.timeout = abortTimeout

  try {
    const response = await railApiFetch("/common/api/v1/railupdates/?LanguageId=Hebrew")
    expect(await response.json()).toEqual({ ok: true })
    expect(pending.size).toBe(0)
    // AbortSignal.timeout() arms a timer nothing can clear.
    expect(abortTimeout).not.toHaveBeenCalled()
  } finally {
    globalThis.setTimeout = realSetTimeout
    globalThis.clearTimeout = realClearTimeout
    AbortSignal.timeout = realAbortTimeout
  }
})

test("a hung rail API request is aborted at the deadline with a TimeoutError", async () => {
  globalThis.fetch = mock(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))
      }),
  ) as typeof fetch

  const error = await railApiFetch("/common/api/v1/railupdates/", { retries: 2, timeoutMs: 20 }).catch((e) => e)
  expect(error?.name).toBe("TimeoutError")
  // The deadline covers the retries too: an aborted call is not attempted again.
  expect(globalThis.fetch).toHaveBeenCalledTimes(1)
})

test("the response keeps its status and body after being read under the deadline", async () => {
  globalThis.fetch = mock(async () => Response.json({ error: "nope" }, { status: 404 })) as typeof fetch
  const response = await railApiFetch("/common/api/v1/missing")
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ error: "nope" })
})
