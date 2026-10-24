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
