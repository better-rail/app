/**
 * relay.test.ts — drives the relay against a local Bun.serve "upstream" that
 * records what reached it, so auth, the allow list, passthrough, timeouts and
 * redaction are all checked without the network.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createRelay, loadConfig, redactKey, type RelayConfig } from "./relay"

const TOKEN = "test-token-123"

type SeenRequest = { method: string; path: string; headers: Record<string, string>; body: string }
const seen: SeenRequest[] = []

let upstream: ReturnType<typeof Bun.serve>
let upstreamUrl: string
let port: number

beforeAll(() => {
  upstream = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      const headers: Record<string, string> = {}
      request.headers.forEach((value, name) => (headers[name] = value))
      seen.push({ method: request.method, path: url.pathname + url.search, headers, body: await request.text() })

      if (url.pathname === "/slow") {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return new Response("late")
      }
      if (url.pathname === "/boom") return new Response("upstream exploded", { status: 500 })
      if (url.pathname === "/redirect") return Response.redirect("https://evil.example/steal", 302)
      if (url.pathname === "/empty") return new Response(null, { status: 204 })
      return Response.json({ echo: url.search, method: request.method }, { headers: { "x-upstream-secret": "hidden" } })
    },
  })
  port = upstream.port ?? 0
  upstreamUrl = `http://127.0.0.1:${port}`
})

afterAll(() => upstream.stop(true))

const baseConfig = (): RelayConfig => ({
  ...loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, RAIL_URL: upstreamUrl }),
  log: () => {},
})

const relay = (overrides: Partial<RelayConfig> = {}) => createRelay({ ...baseConfig(), ...overrides })

const call = (handler: ReturnType<typeof createRelay>, target: string, init: RequestInit = {}, token: string | null = TOKEN) => {
  const headers = new Headers(init.headers)
  if (token !== null) headers.set("authorization", `Bearer ${token}`)
  return handler(new Request(`http://proxy.local/fetch?url=${encodeURIComponent(target)}`, { ...init, headers }))
}

describe("loadConfig", () => {
  test("refuses to start without a token", () => {
    expect(() => loadConfig({ RAIL_URL: "https://rail.example" })).toThrow(/EGRESS_PROXY_TOKEN/)
    expect(() => loadConfig({ EGRESS_PROXY_TOKEN: "  ", RAIL_URL: "https://rail.example" })).toThrow(/EGRESS_PROXY_TOKEN/)
  })

  test("derives the allow list and per-host options from the upstream URLs", () => {
    const config = loadConfig({
      EGRESS_PROXY_TOKEN: TOKEN,
      SIRI_URL: "https://moran.mot.gov.il/Channels/HTTPChannel/SM/2.8",
      SIRI_CA_PEM: "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----",
      RAIL_URL: "https://rail.example:8443/base",
      PROXY_URL: "http://user:pass@proxy.example:3128",
      RAIL_TLS_INSECURE: "true",
      EGRESS_TIMEOUT_MS: "1234",
    })
    expect(config.timeoutMs).toBe(1234)
    expect(config.upstreams.map((u) => [u.name, u.host, u.protocol])).toEqual([
      ["siri", "moran.mot.gov.il", "https:"],
      ["rail", "rail.example:8443", "https:"],
    ])
    expect(config.upstreams[0].init).toEqual({ tls: { ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----" } })
    expect(config.upstreams[1].init).toEqual({ proxy: "http://user:pass@proxy.example:3128", tls: { rejectUnauthorized: false } })
  })

  test("SIRI_TLS_INSECURE is the fallback when no CA is given", () => {
    const config = loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, SIRI_URL: "https://moran.mot.gov.il/x", SIRI_TLS_INSECURE: "true" })
    expect(config.upstreams[0].init).toEqual({ tls: { rejectUnauthorized: false } })
    expect(config.timeoutMs).toBe(60_000)
  })

  test("rejects malformed upstream URLs", () => {
    expect(() => loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, SIRI_URL: "moran.mot.gov.il" })).toThrow(/SIRI_URL/)
    expect(() => loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, RAIL_URL: "ftp://rail.example" })).toThrow(/RAIL_URL/)
  })
})

describe("routing and auth", () => {
  test("health needs no token", async () => {
    const response = await relay()(new Request("http://proxy.local/health"))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
  })

  test("unknown paths are 404", async () => {
    const response = await relay()(new Request("http://proxy.local/anything", { headers: { authorization: `Bearer ${TOKEN}` } }))
    expect(response.status).toBe(404)
  })

  test("401 without a token", async () => {
    const response = await call(relay(), `${upstreamUrl}/x`, {}, null)
    expect(response.status).toBe(401)
  })

  test("401 with a wrong token, including a prefix of the real one", async () => {
    expect((await call(relay(), `${upstreamUrl}/x`, {}, "nope")).status).toBe(401)
    expect((await call(relay(), `${upstreamUrl}/x`, {}, TOKEN.slice(0, -1))).status).toBe(401)
    expect((await call(relay(), `${upstreamUrl}/x`, {}, `${TOKEN}x`)).status).toBe(401)
  })

  test("500 when the relay was built without a token", async () => {
    const response = await call(relay({ token: "" }), `${upstreamUrl}/x`, {}, "")
    expect(response.status).toBe(500)
  })

  test("400 for a missing or relative url", async () => {
    const handler = relay()
    expect(
      (await handler(new Request("http://proxy.local/fetch", { headers: { authorization: `Bearer ${TOKEN}` } }))).status,
    ).toBe(400)
    expect((await call(handler, "/relative/path")).status).toBe(400)
  })

  test("403 for a host that is not allow-listed", async () => {
    const handler = relay()
    const refused = await call(handler, "https://example.com/anything")
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({ error: "target host is not allow-listed", host: "example.com" })
    // Same host, different port: still a different origin.
    expect((await call(handler, `http://127.0.0.1:${port + 1}/x`)).status).toBe(403)
    // Credentials in the URL must not smuggle a different host past the check.
    expect((await call(handler, `http://127.0.0.1:${port}@evil.example/x`)).status).toBe(403)
    expect((await call(handler, `http://user:pass@127.0.0.1:${port}/x`)).status).toBe(403)
  })

  test("plain http is only allowed because the configured upstream is http", async () => {
    const https = loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, RAIL_URL: `https://127.0.0.1:${port}` })
    const response = await call(createRelay({ ...https, log: () => {} }), `${upstreamUrl}/x`)
    expect(response.status).toBe(403)
  })
})

describe("passthrough", () => {
  test("GET keeps method, path, query and the subscription key; drops our bearer", async () => {
    seen.length = 0
    const response = await call(relay(), `${upstreamUrl}/rjpa/api/v1/timetable?from=1&to=2&Key=secret`, {
      headers: { "Ocp-Apim-Subscription-Key": "rail-key", accept: "application/json", "x-custom": "yes" },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toStartWith("application/json")
    expect(response.headers.get("x-egress-upstream-status")).toBe("200")
    expect(response.headers.get("x-upstream-secret")).toBeNull()
    expect(await response.json()).toEqual({ echo: "?from=1&to=2&Key=secret", method: "GET" })

    expect(seen).toHaveLength(1)
    const [request] = seen
    expect(request.method).toBe("GET")
    expect(request.path).toBe("/rjpa/api/v1/timetable?from=1&to=2&Key=secret")
    expect(request.headers["ocp-apim-subscription-key"]).toBe("rail-key")
    expect(request.headers.accept).toBe("application/json")
    expect(request.headers["x-custom"]).toBe("yes")
    expect(request.headers.authorization).toBeUndefined()
    expect(request.headers.host).toBe(`127.0.0.1:${port}`)
  })

  test("POST streams the body and content-type through", async () => {
    seen.length = 0
    const body = JSON.stringify({ methodName: "searchTrainLuzForDateTime", fromStation: 3700 })
    const response = await call(relay(), `${upstreamUrl}/rjpa/api/v1/timetable/searchTrainForMobile`, {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "Ocp-Apim-Subscription-Key": "rail-key" },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ echo: "", method: "POST" })

    const [request] = seen
    expect(request.method).toBe("POST")
    expect(request.path).toBe("/rjpa/api/v1/timetable/searchTrainForMobile")
    expect(request.body).toBe(body)
    expect(request.headers["content-type"]).toBe("application/json")
    expect(request.headers["ocp-apim-subscription-key"]).toBe("rail-key")
    expect(request.headers.authorization).toBeUndefined()
  })

  test("gzips a JSON body when the caller accepts it (the relayed bytes are this host's egress)", async () => {
    const response = await call(relay(), `${upstreamUrl}/rjpa/api/v1/timetable?x=1`, {
      headers: { "accept-encoding": "gzip, br" },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-encoding")).toBe("gzip")
    const inflated = await new Response(response.body!.pipeThrough(new DecompressionStream("gzip"))).json()
    expect(inflated).toEqual({ echo: "?x=1", method: "GET" })

    // Without accept-encoding the body goes out as the upstream sent it.
    const plain = await call(relay(), `${upstreamUrl}/rjpa/api/v1/timetable?x=1`)
    expect(plain.headers.get("content-encoding")).toBeNull()
    expect(await plain.json()).toEqual({ echo: "?x=1", method: "GET" })
  })

  test("upstream 500 passes through with its body", async () => {
    const response = await call(relay(), `${upstreamUrl}/boom`)
    expect(response.status).toBe(500)
    expect(response.headers.get("x-egress-upstream-status")).toBe("500")
    expect(await response.text()).toBe("upstream exploded")
  })

  test("bodiless statuses come back bodiless", async () => {
    const response = await call(relay(), `${upstreamUrl}/empty`)
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
  })

  test("redirects are returned, not followed", async () => {
    seen.length = 0
    const response = await call(relay(), `${upstreamUrl}/redirect`)
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://evil.example/steal")
    expect(seen).toHaveLength(1)
  })
})

describe("failures", () => {
  test("timeout becomes a 504", async () => {
    const response = await call(relay({ timeoutMs: 50 }), `${upstreamUrl}/slow`)
    expect(response.status).toBe(504)
    expect(await response.json()).toEqual({ error: "upstream timeout" })
  })

  test("network error becomes a 502 whose body never carries the query string", async () => {
    const closed = Bun.serve({ port: 0, fetch: () => new Response("") })
    const deadUrl = `http://127.0.0.1:${closed.port}`
    closed.stop(true)

    const config = { ...loadConfig({ EGRESS_PROXY_TOKEN: TOKEN, RAIL_URL: deadUrl }), log: () => {} }
    const response = await call(createRelay(config), `${deadUrl}/json?Key=super-secret&MonitoringRef=1`)
    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toContain("upstream unreachable")
    expect(text).not.toContain("super-secret")
    expect(text).not.toContain("MonitoringRef")
  })

  test("log lines carry the host and path but never the query", async () => {
    const lines: string[] = []
    await call(relay({ log: (line) => lines.push(line) }), `${upstreamUrl}/json?Key=super-secret`)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain(`GET 127.0.0.1:${port}/json -> 200`)
    expect(lines[0]).not.toContain("super-secret")
  })
})

describe("redactKey", () => {
  test("masks the key wherever it appears", () => {
    expect(redactKey("https://moran.mot.gov.il/json?Key=abc123&MonitoringRef=1")).toBe(
      "https://moran.mot.gov.il/json?Key=***&MonitoringRef=1",
    )
    expect(redactKey("failed: key=xyz at end")).toBe("failed: Key=*** at end")
    expect(redactKey("nothing here")).toBe("nothing here")
  })
})
