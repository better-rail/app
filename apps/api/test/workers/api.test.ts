/**
 * api.test.ts — the API on workerd, end to end: the real Worker entry (SELF)
 * with a local D1, KV and the Durable Objects. What the mobile app and the
 * widgets rely on: the timetable search shape, the ride lifecycle (start,
 * alarm, token, end) with the push going out over APNs, fares, and the
 * guarded operator / debug routes.
 */
import { SELF, env, runDurableObjectAlarm } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { applySchema } from "../../src/db"
import { encodePayload } from "../../src/ingest/payload"
import { FARES_KEY } from "../../src/fares/store"
import { AUTH, israelServiceClock, makeFeed, naiveIso, seedFeed } from "./helpers"

const api = "https://api.test/api/v1"
const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
})

// The Worker and its Durable Objects run in this isolate, so the outbound `fetch`
// the push client uses is this global: record what would have gone to APNs.
type Outbound = { url: string; init: RequestInit; body: any }
const outbound: Outbound[] = []
const realFetch = globalThis.fetch
beforeEach(() => {
  outbound.length = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    if (!url.includes("push.apple.com")) throw new Error(`unexpected outbound request to ${url}`)
    outbound.push({ url, init: init ?? {}, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    return new Response("", { status: 200, headers: { "apns-id": "1" } })
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = realFetch
})

describe("timetable", () => {
  it("loads a feed through /internal/ingest and answers searchTrainForMobile in the legacy shape", async () => {
    const feed = makeFeed({ departureOffsetSec: 8 * 3600, checksum: "feed-a" })
    const serviceDate = feed.calendarDates[0].serviceDate

    const ingest = await SELF.fetch(`${api}/internal/ingest`, {
      method: "POST",
      headers: { ...AUTH, "content-type": "application/gzip", "content-encoding": "gzip" },
      body: await encodePayload(feed),
    })
    expect(ingest.status).toBe(200)
    const loaded = (await ingest.json()) as { feedId: string; counts: Record<string, number> }
    expect(loaded.counts.stop_times).toBe(2)

    // Same checksum again: a no-op, not a second feed.
    const again = await SELF.fetch(`${api}/internal/ingest`, {
      method: "POST",
      headers: { ...AUTH, "content-type": "application/gzip", "content-encoding": "gzip" },
      body: await encodePayload(feed),
    })
    expect(await again.json()).toEqual({ unchanged: true })

    const active = await SELF.fetch(`${api}/internal/ingest/active`, { headers: AUTH })
    expect(await active.json()).toMatchObject({ feedId: loaded.feedId, checksum: "feed-a" })

    const search = await SELF.fetch(
      `${api}/rail-api/rjpa/api/v1/timetable/searchTrainForMobile`,
      jsonInit("POST", {
        methodName: "searchTrainLuzForDateTime",
        fromStation: 3700,
        toStation: 3500,
        date: serviceDate,
        hour: "07:00",
        systemType: "1",
        scheduleType: "ByDeparture",
        languageId: "Hebrew",
      }),
    )
    expect(search.status).toBe(200)
    const body = (await search.json()) as any
    expect(body.result.travels).toHaveLength(1)
    const [travel] = body.result.travels
    expect(travel.departureTime).toBe(naiveIso(serviceDate, 8 * 3600))
    expect(travel.arrivalTime).toBe(naiveIso(serviceDate, 8 * 3600 + 20 * 60))
    expect(travel.trains[0]).toMatchObject({
      trainNumber: 100,
      orignStation: 3700,
      destinationStation: 3500,
      originPlatform: 3,
      destPlatform: 1,
      trainPosition: { calcDiffMinutes: 0 },
      stopStations: [],
    })
    expect(travel.trains[0].routeStations).toEqual([
      { stationId: 3700, arrivalTime: "08:00", crowded: 0, platform: 3 },
      { stationId: 3500, arrivalTime: "08:20", crowded: 0, platform: 1 },
    ])

    // The old clients' GET form, scheduleType "1" = by departure.
    const legacy = await SELF.fetch(
      `${api}/rail-api/rjpa/api/v1/timetable/searchTrainLuzForDateTime?fromStation=3700&toStation=3500&date=${serviceDate}&hour=07:00&scheduleType=1`,
    )
    expect(legacy.status).toBe(200)
    expect(((await legacy.json()) as any).result.travels[0].trains[0].trainNumber).toBe(100)
  })

  it("answers the retired endpoints with the empty legacy envelope", async () => {
    const list = await SELF.fetch(`${api}/rail-api/common/api/v1/railupdates/?LanguageId=Hebrew&SystemType=1`)
    expect(list.status).toBe(200)
    expect(await list.json()).toMatchObject({ successStatus: 1, statusCode: 200, errorMessages: null, result: [] })

    const station = await SELF.fetch(
      `${api}/rail-api/common/api/v1/Stations/GetStationInformation?LanguageId=Hebrew&StationId=3700`,
    )
    expect(((await station.json()) as any).result).toBeNull()
  })

  it("answers with no travels on a day without service", async () => {
    await applySchema(env.DB)
    const search = await SELF.fetch(
      `${api}/rail-api/rjpa/api/v1/timetable/searchTrainForMobile`,
      jsonInit("POST", { fromStation: 3700, toStation: 3500, date: "2031-01-01", hour: "07:00", scheduleType: "ByDeparture" }),
    )
    expect(search.status).toBe(200)
    expect(await search.json()).toEqual({ result: { travels: [] } })
  })
})

describe("rides", () => {
  let serviceDate: string
  let departureOffsetSec: number

  beforeEach(async () => {
    // A train leaving in ten minutes, so the ride is inside the startable window.
    const clock = israelServiceClock()
    serviceDate = clock.serviceDate
    departureOffsetSec = clock.offsetSec + 10 * 60
    await seedFeed(makeFeed({ departureOffsetSec, serviceDate }))
  })

  const startRide = async () => {
    const res = await SELF.fetch(
      `${api}/ride`,
      jsonInit("POST", {
        token: "live-activity-token",
        provider: "ios",
        locale: "en",
        departureDate: naiveIso(serviceDate, departureOffsetSec),
        originId: 3700,
        destinationId: 3500,
        trains: [100],
      }),
    )
    return { status: res.status, body: (await res.json()) as { success: boolean; rideId?: string; reason?: string } }
  }

  it("rejects a body that doesn't match the schema", async () => {
    const res = await SELF.fetch(`${api}/ride`, jsonInit("POST", { token: "t" }))
    expect(res.status).toBe(400)
    expect(await res.text()).toBe("Body doesn't match schema")
  })

  it("starts a ride, pushes its state on the first tick, moves its alarm and ends it", async () => {
    const { status, body } = await startRide()
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    const rideId = body.rideId!

    // The first tick: nothing is due yet, so the "wait for your train" state goes out over APNs.
    const stub = env.RIDES.getByName(rideId)
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    expect(outbound).toHaveLength(1)
    const [push] = outbound
    expect(push.url).toBe("https://api.sandbox.push.apple.com/3/device/live-activity-token")
    const headers = new Headers(push.init.headers)
    expect(headers.get("apns-push-type")).toBe("liveactivity")
    expect(headers.get("apns-topic")).toBe("co.il.better-rail.test.push-type.liveactivity")
    expect(headers.get("apns-priority")).toBe("5")
    expect(headers.get("authorization")).toMatch(/^bearer /)
    expect(push.body.aps.event).toBe("update")
    expect(push.body.aps["content-state"]).toEqual({ delay: 0, status: "waitForTrain", nextStationId: 3700 })

    // Arrival alarm: rings leadMinutes before the (delayed) arrival of train 0.
    const alarm = await SELF.fetch(
      `${api}/ride/alarm`,
      jsonInit("PUT", { rideId, token: "app-token", alarmId: crypto.randomUUID(), leadMinutes: 5, locale: "en", stops: [0] }),
    )
    expect(alarm.status).toBe(200)
    const alarmBody = (await alarm.json()) as { success: boolean; stops: { train: number; fireDate: number }[] }
    expect(alarmBody.success).toBe(true)
    expect(alarmBody.stops).toHaveLength(1)
    expect(alarmBody.stops[0].train).toBe(0)
    // Departure in 10 minutes, a 20-minute ride, a 5-minute lead: rings in ~25 minutes, as a real epoch (not the naive timetable clock).
    expect(Math.abs(alarmBody.stops[0].fireDate - Date.now() - 25 * 60 * 1000)).toBeLessThan(90 * 1000)

    const token = await SELF.fetch(`${api}/ride/updateToken`, jsonInit("PATCH", { rideId, token: "new-token" }))
    expect(await token.json()).toEqual({ success: true })

    const removed = await SELF.fetch(`${api}/ride/alarm`, jsonInit("DELETE", { rideId }))
    expect(await removed.json()).toEqual({ success: true })

    const ended = await SELF.fetch(`${api}/ride`, jsonInit("DELETE", { rideId }))
    expect(await ended.json()).toEqual({ success: true })

    // Nothing is scheduled any more.
    expect(await runDurableObjectAlarm(stub)).toBe(false)
  })

  it("refuses a ride whose train isn't in the timetable", async () => {
    const res = await SELF.fetch(
      `${api}/ride`,
      jsonInit("POST", {
        token: "t",
        provider: "android",
        locale: "he",
        departureDate: naiveIso(serviceDate, departureOffsetSec),
        originId: 3700,
        destinationId: 3500,
        trains: [999],
      }),
    )
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, reason: "route_not_found" })
  })

  it("refuses a ride that is more than an hour away", async () => {
    await seedFeed(makeFeed({ departureOffsetSec: departureOffsetSec + 3 * 3600, serviceDate }))
    const res = await SELF.fetch(
      `${api}/ride`,
      jsonInit("POST", {
        token: "t",
        provider: "ios",
        locale: "en",
        departureDate: naiveIso(serviceDate, departureOffsetSec + 3 * 3600),
        originId: 3700,
        destinationId: 3500,
        trains: [100],
      }),
    )
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, reason: "ride_in_future" })
  })

  it("answers the token and alarm routes for an unknown ride like before", async () => {
    expect(await (await SELF.fetch(`${api}/ride/updateToken`, jsonInit("PATCH", { rideId: "nope", token: "t" }))).json()).toEqual(
      {
        success: false,
      },
    )
    const alarm = await SELF.fetch(
      `${api}/ride/alarm`,
      jsonInit("PUT", { rideId: "nope", token: "t", alarmId: crypto.randomUUID(), leadMinutes: 5, locale: "en", stops: [0] }),
    )
    expect(alarm.status).toBe(404)
    expect(await alarm.json()).toEqual({ success: false })
    expect(await (await SELF.fetch(`${api}/ride/alarm`, jsonInit("DELETE", { rideId: "nope" }))).json()).toEqual({
      success: true,
    })
    expect(await (await SELF.fetch(`${api}/ride`, jsonInit("DELETE", { rideId: "nope" }))).json()).toEqual({ success: true })
  })
})

describe("fares", () => {
  it("serves the snapshot in KV", async () => {
    await env.KV.put(
      FARES_KEY,
      JSON.stringify({
        pulledAt: "2026-09-08T00:00:00.000Z",
        railVersion: "1",
        profiles: [
          {
            id: 4,
            name: { he: "אזרח ותיק", en: null, ar: null, ru: null },
            discounts: { single: 0.5, daily: 0.5, monthly: 0.5 },
            discountAtTopUp: false,
            note: null,
          },
        ],
        pairs: { "3700-5010": { distanceCode: 1, prices: { single: 11.5, daily: 23, monthly: 323 } } },
      }),
    )
    // The seed route also writes it; here KV was written directly, so bypass the per-isolate cache window.
    const fare = await SELF.fetch(`${api}/fares?from=3700&to=5010`)
    if (fare.status === 503) {
      // The miss was cached for up to 5 s by an earlier test; wait it out once.
      await new Promise((resolve) => setTimeout(resolve, 5100))
    }
    const fare2 = fare.status === 503 ? await SELF.fetch(`${api}/fares?from=3700&to=5010`) : fare
    expect(fare2.status).toBe(200)
    expect(await fare2.json()).toEqual({
      from: 3700,
      to: 5010,
      distanceCode: 1,
      prices: { single: 11.5, daily: 23, monthly: 323 },
      updatedAt: "2026-09-08T00:00:00.000Z",
    })

    expect((await SELF.fetch(`${api}/fares?from=3700&to=9999`)).status).toBe(404)
    expect((await SELF.fetch(`${api}/fares?from=x&to=1`)).status).toBe(400)
    const profiles = (await (await SELF.fetch(`${api}/fares/profiles`)).json()) as any
    expect(profiles.profiles[0].id).toBe(4)
  })
})

describe("guarded routes", () => {
  it("hides the operator routes without the token", async () => {
    expect((await SELF.fetch(`${api}/internal/ingest/active`)).status).toBe(404)
    expect((await SELF.fetch(`${api}/internal/ingest/active`, { headers: { authorization: "Bearer wrong" } })).status).toBe(404)
  })

  it("answers the active-feed check with JSON null when nothing is loaded", async () => {
    await applySchema(env.DB)
    for (const table of ["stop_times", "calendar_dates", "trips", "routes", "station_map", "stops", "feeds"]) {
      await env.DB.prepare(`DELETE FROM ${table}`).run()
    }
    const res = await SELF.fetch(`${api}/internal/ingest/active`, { headers: AUTH })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
    expect(await res.text()).toBe("null")
  })

  it("hides the SIRI debug routes without the token and answers with the poller state with it", async () => {
    expect((await SELF.fetch(`${api}/siri/status`)).status).toBe(404)
    const status = await SELF.fetch(`${api}/siri/status`, { headers: { "x-debug-token": "test-debug-token" } })
    expect(status.status).toBe(200)
    expect(await status.json()).toEqual({ pollerSeen: false, status: null, snapshot: null })
    const raw = await SELF.fetch(`${api}/siri/raw`, { headers: { "x-debug-token": "test-debug-token" } })
    expect(raw.headers.get("content-type")).toContain("application/json")
    expect(await raw.text()).toBe("[]")
  })
})
