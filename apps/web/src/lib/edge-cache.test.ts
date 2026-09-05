import { describe, expect, test } from "bun:test"
import { edgePolicy, fetchWithEdgeCache, type EdgeCache, type ExecutionContext } from "./edge-cache"

const URL_A = "https://better-rail.co.il/routes/3700/4600?date=2026-09-06&hour=09:00"
const URL_B = "https://better-rail.co.il/routes/3700/4600?date=2026-09-06&hour=10:00"

/** In-memory stand-in for `caches.default`: like the real one it stores a fully read copy. */
function fakeCache() {
  const store = new Map<string, { body: string; status: number; headers: Array<[string, string]> }>()
  const cache: EdgeCache = {
    async match(key) {
      const hit = store.get(key.url)
      return hit ? new Response(hit.body, { status: hit.status, headers: hit.headers }) : undefined
    },
    async put(key, response) {
      store.set(key.url, { body: await response.text(), status: response.status, headers: [...response.headers] })
    },
  }
  return { cache, store }
}

function fakeCtx() {
  const pending: Array<Promise<unknown>> = []
  const ctx: ExecutionContext = { waitUntil: (promise) => void pending.push(promise) }
  return { ctx, settle: () => Promise.all(pending) }
}

const page = (body: string, headers: Record<string, string> = {}, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      ...headers,
    },
  })

/** Renders the given bodies in order (repeating the last one) and counts how often it was asked. */
function renderer(bodies: string[], status = 200) {
  let calls = 0
  const render = async () => page(bodies[Math.min(calls++, bodies.length - 1)] ?? "", {}, status)
  return { render, calls: () => calls }
}

describe("edgePolicy", () => {
  test("reads s-maxage and stale-while-revalidate", () => {
    expect(edgePolicy(page("x"))).toEqual({ sMaxAge: 60, swr: 600 })
    expect(edgePolicy(page("x", { "CDN-Cache-Control": "public, s-maxage=30" }))).toEqual({ sMaxAge: 30, swr: 0 })
  })

  test("refuses what must not be shared", () => {
    expect(edgePolicy(page("x", {}, 404))).toBeNull()
    expect(edgePolicy(page("x", {}, 307))).toBeNull()
    expect(edgePolicy(page("x", { "CDN-Cache-Control": "private, s-maxage=60" }))).toBeNull()
    expect(edgePolicy(page("x", { "CDN-Cache-Control": "no-store" }))).toBeNull()
    expect(edgePolicy(page("x", { "CDN-Cache-Control": "public, s-maxage=0" }))).toBeNull()
    expect(edgePolicy(page("x", { "Set-Cookie": "a=b" }))).toBeNull()
    expect(edgePolicy(new Response("x"))).toBeNull()
  })
})

describe("fetchWithEdgeCache", () => {
  test("stores a miss and serves the stored copy while fresh, whatever the request headers", async () => {
    let time = 1_000_000
    const { cache, store } = fakeCache()
    const { ctx, settle } = fakeCtx()
    const { render, calls } = renderer(["v1"])
    const options = { cache, ctx, now: () => time }

    const miss = await fetchWithEdgeCache(new Request(URL_A), render, options)
    expect(miss.headers.get("X-Edge-Cache")).toBe("MISS")
    expect(miss.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate")
    expect(await miss.text()).toBe("v1")
    await settle()
    expect(store.get(URL_A)?.headers).toContainEqual(["cache-control", "public, s-maxage=660"])

    time += 59_000
    const hit = await fetchWithEdgeCache(new Request(URL_A, { headers: { Cookie: "irrelevant" } }), render, options)
    expect(hit.headers.get("X-Edge-Cache")).toBe("HIT")
    expect(hit.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate")
    expect(hit.headers.get("CDN-Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=600")
    expect(hit.headers.get("Content-Type")).toBe("text/html")
    expect(hit.headers.get("X-Edge-Fresh-Until")).toBeNull()
    expect(hit.headers.get("X-Edge-Browser-Cache-Control")).toBeNull()
    expect(await hit.text()).toBe("v1")
    expect(calls()).toBe(1)
  })

  test("serves stale past s-maxage and refreshes in the background", async () => {
    let time = 1_000_000
    const { cache } = fakeCache()
    const { ctx, settle } = fakeCtx()
    const { render, calls } = renderer(["v1", "v2"])
    const options = { cache, ctx, now: () => time }

    await (await fetchWithEdgeCache(new Request(URL_A), render, options)).text()
    await settle()

    time += 61_000
    const stale = await fetchWithEdgeCache(new Request(URL_A), render, options)
    expect(stale.headers.get("X-Edge-Cache")).toBe("STALE")
    expect(await stale.text()).toBe("v1")
    await settle()
    expect(calls()).toBe(2)

    const hit = await fetchWithEdgeCache(new Request(URL_A), render, options)
    expect(hit.headers.get("X-Edge-Cache")).toBe("HIT")
    expect(await hit.text()).toBe("v2")
    expect(calls()).toBe(2)
  })

  test("keys on the full URL, query included", async () => {
    const { cache } = fakeCache()
    const { ctx, settle } = fakeCtx()
    const { render, calls } = renderer(["a", "b"])
    const options = { cache, ctx }

    expect(await (await fetchWithEdgeCache(new Request(URL_A), render, options)).text()).toBe("a")
    expect(await (await fetchWithEdgeCache(new Request(URL_B), render, options)).text()).toBe("b")
    await settle()
    expect(await (await fetchWithEdgeCache(new Request(URL_A), render, options)).text()).toBe("a")
    expect(await (await fetchWithEdgeCache(new Request(URL_B), render, options)).text()).toBe("b")
    expect(calls()).toBe(2)
  })

  test("leaves uncacheable responses alone", async () => {
    const { cache, store } = fakeCache()
    const { ctx, settle } = fakeCtx()
    const { render, calls } = renderer(["missing"], 404)
    const options = { cache, ctx }

    const first = await fetchWithEdgeCache(new Request(URL_A), render, options)
    expect(first.status).toBe(404)
    expect(first.headers.get("X-Edge-Cache")).toBeNull()
    await settle()
    expect(store.size).toBe(0)
    await fetchWithEdgeCache(new Request(URL_A), render, options)
    expect(calls()).toBe(2)
  })

  test("bypasses the cache for non-GET requests and when there is no cache", async () => {
    const { cache, store } = fakeCache()
    const { ctx, settle } = fakeCtx()
    const { render, calls } = renderer(["v1"])

    const post = await fetchWithEdgeCache(new Request(URL_A, { method: "POST" }), render, { cache, ctx })
    expect(post.headers.get("X-Edge-Cache")).toBeNull()
    await settle()
    expect(store.size).toBe(0)

    const uncached = await fetchWithEdgeCache(new Request(URL_A), render, { cache: undefined })
    expect(uncached.headers.get("X-Edge-Cache")).toBeNull()
    expect(await uncached.text()).toBe("v1")
    expect(calls()).toBe(2)
  })
})
