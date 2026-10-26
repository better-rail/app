/**
 * status.test.ts — the status screens' routes and the push subscriptions on workerd:
 * the real Worker entry (SELF) with a local D1 and the gatherer / alerts Durable Objects.
 */
import { SELF, env } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"

import { ALERTS_NAME } from "../../src/alerts/alerts-do"
import { applySchema, invalidateActiveFeedCache } from "../../src/db"
import { STATUS_NAME } from "../../src/service-status/state"
import { invalidateDeparturesCache } from "../../src/status/departures"
import { invalidateServiceStatusCache } from "../../src/status/service-status"
import { israelServiceClock, makeFeed, seedFeed } from "./helpers"

const api = "https://api.test/api/v1"
const DEBUG = { "x-debug-token": "test-debug-token" }
const jsonInit = (method: string, body: unknown) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
})
const TOKEN = "a".repeat(64)

// The Worker runs in this isolate, so its per-isolate caches outlive a test's feed.
beforeEach(() => {
  invalidateActiveFeedCache()
  invalidateServiceStatusCache()
  invalidateDeparturesCache()
})

describe("service status", () => {
  it("answers 503 without a feed", async () => {
    await applySchema(env.DB)
    for (const table of ["stop_times", "calendar_dates", "trips", "feeds"]) await env.DB.prepare(`DELETE FROM ${table}`).run()
    const response = await SELF.fetch(`${api}/service-status`)
    expect(response.status).toBe(503)
  })

  describe("with a feed", () => {
    let departureOffsetSec: number

    beforeEach(async () => {
      // Train 100 (line 1 in the catalogue) leaves Savidor in ten minutes.
      const clock = israelServiceClock()
      departureOffsetSec = clock.offsetSec + 10 * 60
      await seedFeed(makeFeed({ departureOffsetSec, serviceDate: clock.serviceDate }))
    })

    it("derives every catalogue line, unknown without live data", async () => {
      const response = await SELF.fetch(`${api}/service-status`)
      expect(response.status).toBe(200)
      expect(response.headers.get("cache-control")).toBe("public, max-age=15")
      const status = (await response.json()) as any
      expect(status.schemaVersion).toBe(1)
      expect(status.realtime).toEqual({ available: false, updatedAt: null })
      expect(status.announcements).toEqual({ updatedAt: null })
      expect(status.timetable).toEqual({ checkedAt: null, available: false })
      expect(status.lines).toHaveLength(14)
      const line1 = status.lines.find((l: any) => l.lineId === "1")
      expect(line1).toMatchObject({ level: "unknown", trains: { active: 1 } })
      expect(status.lines.find((l: any) => l.lineId === "9").level).toBe("noService")
    })

    it("lists a station's next trains per line and direction", async () => {
      const response = await SELF.fetch(`${api}/stations/3700/departures`)
      expect(response.status).toBe(200)
      const departures = (await response.json()) as any
      expect(departures).toMatchObject({ schemaVersion: 1, stationId: "3700", realtime: { available: false } })
      expect(departures.lines).toHaveLength(1)
      expect(departures.lines[0].lineId).toBe("1")
      expect(departures.lines[0].directions[0].towardsStationId).toBe("1600")
      expect(departures.lines[0].directions[0].trains[0]).toMatchObject({
        trainNumber: 100,
        delayMinutes: 0,
        platform: 3,
        destinationStationId: "3500",
        cancelled: false,
        live: false,
      })

      expect((await SELF.fetch(`${api}/stations/1/departures`)).status).toBe(404)
    })

    it("answers 503 for a station page while the rail API is unset, 404 for an unknown station", async () => {
      expect((await SELF.fetch(`${api}/stations/3700/info?locale=en`)).status).toBe(503)
      expect((await SELF.fetch(`${api}/stations/1/info`)).status).toBe(503)
    })
  })
})

describe("push subscriptions", () => {
  const alerts = () => env.ALERTS.getByName(ALERTS_NAME)

  beforeEach(async () => {
    const clock = israelServiceClock()
    await seedFeed(makeFeed({ departureOffsetSec: clock.offsetSec + 10 * 60, serviceDate: clock.serviceDate }))
    await SELF.fetch(`${api}/station-alerts`, jsonInit("DELETE", { token: TOKEN }))
    await SELF.fetch(`${api}/delay-guards`, jsonInit("DELETE", { token: TOKEN }))
  })

  it("keeps a device's station alerts in the alerts object and checks them without pushing", async () => {
    const subscribe = await SELF.fetch(
      `${api}/station-alerts`,
      jsonInit("PUT", {
        token: TOKEN,
        provider: "ios",
        locale: "he",
        stations: [
          { stationId: "3700", lineIds: null },
          { stationId: "3700", lineIds: ["1"], dayTypes: ["weekday"] },
        ],
      }),
    )
    expect(subscribe.status).toBe(200)
    expect(await subscribe.json()).toEqual({ success: true })
    expect((await alerts().getStatus()).stationAlerts).toBe(1)

    const unknown = await SELF.fetch(
      `${api}/station-alerts`,
      jsonInit("PUT", { token: TOKEN, provider: "ios", locale: "he", stations: [{ stationId: "1", lineIds: null }] }),
    )
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ success: false, reason: "unknown_station", stationId: "1" })

    const invalid = await SELF.fetch(`${api}/station-alerts`, jsonInit("PUT", { token: "short", provider: "ios" }))
    expect(invalid.status).toBe(400)

    // No live data: the station is unknown, so nothing is said (and nothing reaches APNs).
    const checks = await alerts().runChecks()
    expect(checks.stationAlerts).toEqual({ subscriptions: 1, stations: 1, pushed: 0, dropped: 0 })

    const unsubscribe = await SELF.fetch(`${api}/station-alerts`, jsonInit("DELETE", { token: TOKEN }))
    expect(unsubscribe.status).toBe(200)
    expect((await alerts().getStatus()).stationAlerts).toBe(0)
  })

  it("keeps a device's Delay Notifications, one per train and boarding station", async () => {
    const guard = (trainNumber: number, originStationId = "3700") => ({
      trainNumber,
      originStationId,
      destinationStationId: "3500",
      departureTime: "08:00",
      thresholdMinutes: 3,
    })
    const subscribe = await SELF.fetch(
      `${api}/delay-guards`,
      jsonInit("PUT", { token: TOKEN, provider: "android", locale: "en", guards: [guard(100), guard(100), guard(102)] }),
    )
    expect(subscribe.status).toBe(200)
    expect((await alerts().getStatus()).delayGuards).toBe(1)

    const checks = await alerts().runChecks()
    expect(checks.delayGuards).toEqual({ subscriptions: 1, guards: 2, pushed: 0, dropped: 0 })

    const unknown = await SELF.fetch(
      `${api}/delay-guards`,
      jsonInit("PUT", { token: TOKEN, provider: "android", locale: "en", guards: [guard(100, "1")] }),
    )
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ success: false, reason: "unknown_station" })
  })
})

describe("the gatherer", () => {
  it("stays idle without the rail API and publishes nothing", async () => {
    const gatherer = env.STATUS.getByName(STATUS_NAME)
    expect(await gatherer.ensureRunning()).toBe(false)
    expect(await gatherer.getAnnouncements()).toBeNull()
    expect(await gatherer.getTimetableCheck()).toBeNull()

    const announcements = await SELF.fetch(`${api}/siri/announcements`, { headers: DEBUG })
    expect(announcements.status).toBe(200)
    expect(await announcements.json()).toBeNull()
    const tasks = await SELF.fetch(`${api}/siri/tasks`, { headers: DEBUG })
    expect(((await tasks.json()) as any).alerts).toMatchObject({ stationAlerts: expect.any(Number) })
    expect((await SELF.fetch(`${api}/siri/tasks`)).status).toBe(404)
  })
})
