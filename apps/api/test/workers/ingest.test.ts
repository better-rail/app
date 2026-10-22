/**
 * ingest.test.ts — the Worker half of the ingest against a real (local) D1:
 * loadFeed's inserts, the platform precedence (SIRI-learned -> previous feed ->
 * GTFS platform_code -> none), the checksum refusal, the atomic swap and the
 * prune to two feeds, plus the platform store's chunked upsert.
 */
import { env } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"

import { applySchema, query } from "../../src/db"
import { activeFeedSummary, loadFeed, UnchangedFeedError } from "../../src/ingest/load"
import type { RailFeedPayload } from "../../src/ingest/payload"
import { loadLearnedPlatforms, recordObservedPlatforms } from "../../src/siri/platform-store"

const log = (message: string, meta?: unknown) => console.log(`[test-ingest] ${message}${meta ? " " + JSON.stringify(meta) : ""}`)

type PayloadOptions = {
  /** gtfsPlatformCode per `${tripId}:${stopId}` (default none). */
  gtfsPlatforms?: Record<string, string>
  feedEndDate?: string | null
  /** Extra stop_times rows to push the load over one statement / one batch. */
  extraTrips?: number
}

// Two trains (100, 200) between Tel Aviv (3700) and Herzliya (3500).
const makePayload = (checksum: string, options: PayloadOptions = {}): RailFeedPayload => {
  const gtfs = options.gtfsPlatforms ?? {}
  const stopTime = (tripId: string, seq: number, stopId: string, railId: number, arr: number) => ({
    tripId,
    stopSequence: seq,
    stopId,
    arrOffsetSec: arr,
    depOffsetSec: arr + 60,
    railId,
    gtfsPlatformCode: gtfs[`${tripId}:${stopId}`] ?? null,
  })
  const payload: RailFeedPayload = {
    checksum,
    feedInfo: {
      feedStartDate: "2026-10-22",
      feedEndDate: options.feedEndDate === undefined ? "2026-10-31" : options.feedEndDate,
      feedVersion: "2.0",
    },
    stops: [
      {
        stopId: "N3700",
        stopCode: "17000",
        stopName: "תל אביב - סבידור מרכז",
        lat: 32.083715,
        lon: 34.798247,
        locationType: 1,
        parentStation: null,
        platformCode: null,
      },
      {
        stopId: "P3700",
        stopCode: "17001",
        stopName: "תל אביב - סבידור מרכז",
        lat: 32.083715,
        lon: 34.798247,
        locationType: 0,
        parentStation: "N3700",
        platformCode: null,
      },
      {
        stopId: "N3500",
        stopCode: "17100",
        stopName: "הרצליה",
        lat: 32.163558,
        lon: 34.817406,
        locationType: 1,
        parentStation: null,
        platformCode: null,
      },
      {
        stopId: "P3500",
        stopCode: "17101",
        stopName: "הרצליה",
        lat: 32.163558,
        lon: 34.817406,
        locationType: 0,
        parentStation: "N3500",
        platformCode: null,
      },
    ],
    stationMap: [
      { gtfsStationId: "N3700", railId: 3700, stopCode: "17000" },
      { gtfsStationId: "N3500", railId: 3500, stopCode: "17100" },
    ],
    routes: [
      { routeId: "R1", routeLongName: "תל אביב - הרצליה" },
      { routeId: "R2", routeLongName: "הרצליה - תל אביב" },
    ],
    trips: [
      { tripId: "T1", routeId: "R1", serviceId: "S1", trainNumber: 100 },
      { tripId: "T2", routeId: "R2", serviceId: "S1", trainNumber: 200 },
    ],
    calendarDates: [
      { serviceId: "S1", serviceDate: "2026-10-22" },
      { serviceId: "S1", serviceDate: "2026-10-23" },
    ],
    stopTimes: [
      stopTime("T1", 1, "P3700", 3700, 23 * 3600 + 50 * 60),
      stopTime("T1", 2, "P3500", 3500, 25 * 3600 + 30 * 60),
      stopTime("T2", 1, "P3500", 3500, 6 * 3600),
      stopTime("T2", 2, "P3700", 3700, 6 * 3600 + 20 * 60),
    ],
    warnings: ["1 known station(s) absent from this feed (no service): 1220"],
  }
  for (let i = 0; i < (options.extraTrips ?? 0); i++) {
    const tripId = `X${i}`
    payload.trips.push({ tripId, routeId: "R1", serviceId: "S1", trainNumber: 1000 + i })
    payload.stopTimes.push(stopTime(tripId, 1, "P3700", 3700, 7 * 3600 + i), stopTime(tripId, 2, "P3500", 3500, 8 * 3600 + i))
  }
  return payload
}

const count = async (table: string, feedId?: string): Promise<number> => {
  const sql = feedId ? `SELECT COUNT(*) AS n FROM ${table} WHERE feed_id = ?` : `SELECT COUNT(*) AS n FROM ${table}`
  const { rows } = await query<{ n: number }>(sql, feedId ? [feedId] : [], env.DB)
  return rows[0].n
}

const platformOf = async (feedId: string, tripId: string, stopId: string): Promise<string | null> => {
  const { rows } = await query<{ platform_code: string | null }>(
    `SELECT platform_code FROM stop_times WHERE feed_id = ? AND trip_id = ? AND stop_id = ?`,
    [feedId, tripId, stopId],
    env.DB,
  )
  return rows[0]?.platform_code ?? null
}

const ALL_TABLES = ["feeds", "stops", "station_map", "routes", "trips", "calendar_dates", "stop_times", "train_platforms"]

// The pool shares one local D1 across the file's tests, so every test starts from empty tables.
beforeEach(async () => {
  await applySchema(env.DB)
  await env.DB.batch(ALL_TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)))
})

describe("loadFeed", () => {
  it("reports no active feed on an empty database", async () => {
    expect(await activeFeedSummary(env.DB)).toBeNull()
  })

  it("loads a feed, activates it and bakes in platforms by precedence", async () => {
    // SIRI-learned platform for train 100 at Tel Aviv beats the GTFS platform_code.
    await env.DB.prepare(`INSERT INTO train_platforms (train_number, rail_id, platform) VALUES (100, 3700, 4)`).run()

    const result = await loadFeed(env.DB, makePayload("sha-1", { gtfsPlatforms: { "T1:P3700": "9", "T2:P3500": "7" } }), log)
    expect(result.pruned).toEqual([])
    expect(result.warnings).toEqual(["1 known station(s) absent from this feed (no service): 1220"])
    expect(result.counts).toEqual({ stops: 4, station_map: 2, routes: 2, trips: 2, calendar_dates: 2, stop_times: 4 })

    const active = await activeFeedSummary(env.DB)
    expect(active).toEqual({ feedId: result.feedId, checksum: "sha-1", feedEndDate: "2026-10-31" })

    for (const [table, n] of Object.entries(result.counts)) expect(await count(table, result.feedId)).toBe(n)
    const { rows: feeds } = await query<{ is_active: number }>(`SELECT is_active FROM feeds`, [], env.DB)
    expect(feeds).toEqual([{ is_active: 1 }])

    expect(await platformOf(result.feedId, "T1", "P3700")).toBe("4") // learned
    expect(await platformOf(result.feedId, "T2", "P3500")).toBe("7") // GTFS platform_code
    expect(await platformOf(result.feedId, "T2", "P3700")).toBeNull() // nothing known
  })

  it("carries the previous feed's platforms forward, below SIRI-learned ones", async () => {
    const first = await loadFeed(env.DB, makePayload("sha-1", { gtfsPlatforms: { "T2:P3500": "7", "T1:P3500": "2" } }), log)
    expect(await platformOf(first.feedId, "T2", "P3500")).toBe("7")

    // Learned after the first load: overrides what the previous feed had for (100, 3500).
    await env.DB.prepare(`INSERT INTO train_platforms (train_number, rail_id, platform) VALUES (100, 3500, 5)`).run()

    const second = await loadFeed(env.DB, makePayload("sha-2"), log)
    expect(await platformOf(second.feedId, "T2", "P3500")).toBe("7") // previous feed
    expect(await platformOf(second.feedId, "T1", "P3500")).toBe("5") // learned beats previous ("2")
    expect(await platformOf(second.feedId, "T2", "P3700")).toBeNull()
  })

  it("refuses a payload whose checksum matches the active feed", async () => {
    await loadFeed(env.DB, makePayload("sha-1"), log)
    await expect(loadFeed(env.DB, makePayload("sha-1"), log)).rejects.toBeInstanceOf(UnchangedFeedError)
    expect(await count("feeds")).toBe(1)
  })

  it("swaps atomically and prunes to the two newest feeds", async () => {
    const first = await loadFeed(env.DB, makePayload("sha-1"), log)
    const second = await loadFeed(env.DB, makePayload("sha-2"), log)
    expect(second.pruned).toEqual([])
    const third = await loadFeed(env.DB, makePayload("sha-3"), log)

    expect(third.pruned).toEqual([first.feedId])
    expect((await activeFeedSummary(env.DB))?.feedId).toBe(third.feedId)

    const { rows: feeds } = await query<{ feed_id: number; is_active: number }>(
      `SELECT feed_id, is_active FROM feeds ORDER BY feed_id`,
      [],
      env.DB,
    )
    expect(feeds).toEqual([
      { feed_id: Number(second.feedId), is_active: 0 },
      { feed_id: Number(third.feedId), is_active: 1 },
    ])
    for (const table of ["stops", "station_map", "routes", "trips", "calendar_dates", "stop_times"]) {
      expect(await count(table, first.feedId)).toBe(0)
      expect(await count(table, second.feedId)).toBeGreaterThan(0)
    }
  })

  it("chunks large tables under D1's parameter cap across several batches", async () => {
    // 2,000 extra trips -> 4,004 stop_times rows -> 334 statements of 12 rows -> 2+ batches.
    const result = await loadFeed(env.DB, makePayload("sha-big", { extraTrips: 2000 }), log)
    expect(await count("stop_times", result.feedId)).toBe(4004)
    expect(await count("trips", result.feedId)).toBe(2002)
  })

  it("warns when the feed's validity window is about to close", async () => {
    const soon = new Date(Date.now() + 86_400 * 1000).toISOString().slice(0, 10)
    const result = await loadFeed(env.DB, makePayload("sha-1", { feedEndDate: soon }), log)
    expect(result.warnings.some((w) => w.includes("validity window is closing"))).toBe(true)
  })
})

describe("platform store", () => {
  it("upserts observations in parameter-capped chunks and dedupes repeats", async () => {
    const observations = Array.from({ length: 80 }, (_, i) => ({ trainNumber: 5000 + i, railId: 3700, platform: (i % 6) + 1 }))
    expect(await recordObservedPlatforms(observations, env.DB)).toBe(80)
    expect(await recordObservedPlatforms(observations, env.DB)).toBe(0)

    const changed = [{ trainNumber: 5000, railId: 3700, platform: 9 }]
    expect(await recordObservedPlatforms(changed, env.DB)).toBe(1)

    const learned = await loadLearnedPlatforms(env.DB)
    expect(learned.size).toBe(80)
    expect(learned.get("5000:3700")).toBe(9)
    expect(learned.get("5001:3700")).toBe(2)
  })
})
