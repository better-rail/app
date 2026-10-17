import { describe, expect, test } from "bun:test"

import type { DayTrips, TripData } from "../requests/gtfs-route-api"
import {
  type Pair,
  type TimetableCheck,
  checkResponse,
  compareLeg,
  coverTrips,
  legStops,
  runTimetableCheck,
} from "../service-status/timetable"
import { deriveServiceStatus } from "../status/service-status"
import type { RailApiGetRoutesResult, Train } from "../types/rail-response"
import { parseOffsetSec, toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-09-14"
const ts = (clock: string, date = DATE) => toEpochMs(date, parseOffsetSec(clock))
const iso = (clock: string, date = DATE) => `${date}T${clock}:00`

/** [railId, "HH:MM"] pairs → a trip; arrival == departure at every stop. */
const trip = (trainNumber: number, stops: [number, string][], date = DATE): TripData => ({
  tripKey: `${date}#trip-${trainNumber}`,
  trainNumber,
  routeId: "r",
  stops: stops.map(([railId, clock]) => ({ railId, platform: 1, arrTs: ts(clock, date), depTs: ts(clock, date) })),
})

// Binyamina – Ashkelon (line 2) between Herzliya and Ashkelon.
const line2Train = (n: number, dep: string, date = DATE) =>
  trip(
    n,
    [
      [3500, dep],
      [3700, add(dep, 10)],
      [4600, add(dep, 14)],
      [4900, add(dep, 20)],
      [5000, add(dep, 35)],
      [5200, add(dep, 45)],
      [5800, add(dep, 65)],
      [5900, add(dep, 80)],
    ],
    date,
  )

// Herzliya – Jerusalem (line 7).
const line7Train = (n: number, dep: string) =>
  trip(n, [
    [3500, dep],
    [3700, add(dep, 10)],
    [4600, add(dep, 14)],
    [4900, add(dep, 20)],
    [8600, add(dep, 30)],
    [680, add(dep, 60)],
  ])

function add(clock: string, minutes: number): string {
  const total = parseOffsetSec(clock) / 60 + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** A search result leg as Israel Railways returns it, from a trip (or a variation of it). */
const legOf = (t: TripData, pair: Pair, overrides: Partial<Train> = {}): Train => {
  const at = t.stops.findIndex((s) => s.railId === pair.from)
  const to = t.stops.findIndex((s) => s.railId === pair.to)
  const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16)
  return {
    trainNumber: t.trainNumber,
    orignStation: pair.from,
    destinationStation: pair.to,
    originPlatform: 1,
    destPlatform: 1,
    freeSeats: 0,
    departureTime: new Date(t.stops[at].depTs).toISOString().slice(0, 19),
    arrivalTime: new Date(t.stops[to].arrTs).toISOString().slice(0, 19),
    stopStations: [],
    handicap: 0,
    crowded: 0,
    trainPosition: null,
    routeStations: t.stops.map((s) => ({ stationId: s.railId, arrivalTime: clock(s.arrTs), crowded: 0, platform: 1 })),
    ...overrides,
  }
}

const response = (legs: Train[], messages: unknown[] = []): RailApiGetRoutesResult => ({
  result: {
    travels: legs.map((leg) => ({
      departureTime: leg.departureTime,
      arrivalTime: leg.arrivalTime,
      freeSeats: 0,
      travelMessages: messages,
      trains: [leg],
    })),
  },
})

const PAIR: Pair = { from: 3700, to: 4600 }

describe("coverTrips", () => {
  test("picks the fewest pairs that see every trip, largest first", () => {
    const trips = [
      line2Train(230, "08:00"),
      line2Train(232, "08:30"),
      line7Train(704, "08:10"),
      trip(9001, [
        [7300, "08:00"],
        [7500, "08:40"],
      ]),
    ]
    const cover = coverTrips(trips)
    expect(cover).toHaveLength(2)
    expect(cover[0].trips).toHaveLength(3)
    expect(cover[1]).toMatchObject({ pair: { from: 7300, to: 7500 } })
    expect(cover[1].trips.map((t) => t.trainNumber)).toEqual([9001])
    expect(coverTrips([])).toEqual([])
  })
})

describe("legStops", () => {
  test("turns the route's clock times into stops, rolling over midnight", () => {
    const leg = legOf(line2Train(7159, "23:30"), PAIR)
    const stops = legStops(leg, DATE)
    expect(stops).toHaveLength(8)
    expect(new Date(stops[0].arrTs).toISOString()).toBe("2026-09-14T23:30:00.000Z")
    expect(new Date(stops[7].arrTs).toISOString()).toBe("2026-09-15T00:50:00.000Z")
  })
})

describe("compareLeg", () => {
  const t = line2Train(230, "08:00")

  test("the same route says nothing", () => {
    expect(compareLeg(t, legOf(t, PAIR))).toBeUndefined()
  })

  test("a stop gone from the route is skipped; a route ending early is curtailed", () => {
    const leg = legOf(t, PAIR)
    leg.routeStations = leg.routeStations.filter((s) => s.stationId !== 5000 && s.stationId !== 5200)
    expect(compareLeg(t, leg)).toEqual({ skipped: [5000, 5200] })

    const short = legOf(t, PAIR)
    short.routeStations = short.routeStations.slice(0, -1)
    expect(compareLeg(t, short)).toEqual({ curtailedTo: 5800 })
  })

  test("a route with a station the schedule lacks is a mismatch, not a disruption", () => {
    const leg = legOf(t, PAIR)
    leg.routeStations.push({ stationId: 1600, arrivalTime: "10:00", crowded: 0, platform: 1 })
    expect(compareLeg(t, leg)).toBeUndefined()
  })

  test("Israel Railways' delay is kept for the record", () => {
    expect(compareLeg(t, legOf(t, PAIR, { trainPosition: { calcDiffMinutes: 7 } }))).toEqual({ delayMin: 7 })
  })
})

describe("checkResponse", () => {
  const a = line2Train(230, "08:00")
  const b = line2Train(232, "08:30")
  const c = line2Train(234, "09:00")

  test("a scheduled train the timetable does not list is cancelled; one it lists is confirmed", () => {
    const result = checkResponse(PAIR, DATE, [a, b, c], [a, b, c], response([legOf(a, PAIR), legOf(c, PAIR)]))
    expect(result.trusted).toBe(true)
    expect(result.confirmed).toBe(2)
    expect(result.trains).toEqual({ [b.tripKey]: { cancelled: true } })
    expect(result.extras).toEqual([])
  })

  test("the same number at another time does not count, across service dates", () => {
    // Train 230 of the previous service date leaving after midnight is that date's trip, not today's.
    const yesterday = line2Train(230, "23:55", "2026-09-13")
    const today = line2Train(230, "08:00")
    const legYesterday = legOf(yesterday, PAIR)
    const result = checkResponse(PAIR, DATE, [today], [yesterday, today], response([legYesterday]))
    expect(result.trains).toEqual({ [today.tripKey]: { cancelled: true } })
    expect(result.extras).toEqual([])
  })

  test("a train the schedule has no trip for is extra, when it leaves within the window", () => {
    const extra = line2Train(9876, "08:45")
    const result = checkResponse(PAIR, DATE, [a], [a], response([legOf(a, PAIR), legOf(extra, PAIR)]))
    expect(result.extras).toHaveLength(1)
    expect(result.extras[0]).toMatchObject({ trainNumber: 9876, serviceDate: DATE })
    expect(result.extras[0].stops.map((s) => s.railId)).toEqual(extra.stops.map((s) => s.railId))

    const windowed = checkResponse(PAIR, DATE, [a], [a], response([legOf(a, PAIR), legOf(extra, PAIR)]), {
      from: ts("09:30"),
      to: ts("11:00"),
    })
    expect(windowed.extras).toEqual([])
  })

  test("too many missing trains means the schedule is off, and nothing is concluded", () => {
    const expected = [230, 232, 234, 236, 238, 240].map((n, i) => line2Train(n, add("08:00", i * 10)))
    const result = checkResponse(PAIR, DATE, expected, expected, response([legOf(expected[0], PAIR)]))
    expect(result.trusted).toBe(false)
    expect(result.trains).toEqual({})
  })
})

describe("runTimetableCheck", () => {
  test("covers the trains due in the window with as few searches as possible and publishes what differs", async () => {
    const a = line2Train(230, "08:00")
    const b = line2Train(232, "08:30")
    const later = line2Train(260, "13:00") // outside the window
    const jerusalem = line7Train(704, "08:10")
    const yesterday = line2Train(7159, "23:30", "2026-09-13") // still running at 00:10
    const days: Record<string, DayTrips> = {
      "2026-09-13": new Map([[yesterday.tripKey, yesterday]]),
      [DATE]: new Map([a, b, later, jerusalem].map((t) => [t.tripKey, t])),
      "2026-09-15": new Map(),
    }
    const searches: { pair: Pair; date: string; hour: string }[] = []
    let written: TimetableCheck | undefined

    const check = await runTimetableCheck({
      feedId: async () => "66",
      loadTrips: async (_feedId, date) => days[date] ?? new Map(),
      nowNaiveMs: () => ts("08:05"),
      nowRealMs: () => 1_000,
      search: async (pair, date, hour) => {
        searches.push({ pair, date, hour })
        // Train 232 has gone; 704 runs; nothing else.
        return response([legOf(a, pair), legOf(jerusalem, pair)])
      },
      write: async (c) => {
        written = c
      },
    })

    expect(check).not.toBeNull()
    // Every train due leaves Herzliya for Savidor: one search, from the earliest of them.
    expect(searches).toEqual([{ pair: { from: 3500, to: 3700 }, date: DATE, hour: "08:00" }])
    expect(check?.scheduled).toBe(3)
    expect(check?.confirmed).toBe(2)
    expect(check?.trains).toEqual({ [b.tripKey]: { cancelled: true } })
    expect(check?.window).toEqual({ from: iso("07:35"), to: iso("10:05") })
    expect(written).toBe(check)
  })

  test("a failed search leaves its trains unjudged", async () => {
    const a = line2Train(230, "08:00")
    const check = await runTimetableCheck({
      feedId: async () => "66",
      loadTrips: async (_feedId, date) => (date === DATE ? new Map([[a.tripKey, a]]) : new Map()),
      nowNaiveMs: () => ts("08:05"),
      nowRealMs: () => 1_000,
      search: async () => {
        throw new Error("HTTP 500")
      },
      write: async () => undefined,
    })
    expect(check).toMatchObject({ requests: 1, trusted: 0, scheduled: 1, confirmed: 0, trains: {}, extras: [] })
  })
})

// --- laid over the status ---------------------------------------------------------------

const NOW_REAL = Date.parse("2026-09-14T09:00:00+03:00")

const timetable = (
  trains: TimetableCheck["trains"],
  extras: TimetableCheck["extras"] = [],
  updatedAt = NOW_REAL,
): TimetableCheck => ({
  updatedAt,
  feedId: "66",
  window: { from: iso("08:30"), to: iso("11:00") },
  requests: 1,
  trusted: 1,
  scheduled: 2,
  confirmed: 1,
  trains,
  extras,
  messages: [],
})

const derive = (trips: TripData[], check: TimetableCheck | null) =>
  deriveServiceStatus({
    trips: new Map(trips.map((t) => [t.tripKey, t])),
    snapshot: null,
    timetable: check,
    nowNaiveMs: ts("09:00"),
    nowRealMs: NOW_REAL,
    serviceDate: DATE,
  })

describe("deriveServiceStatus with the timetable check", () => {
  test("a train missing from the timetable is a cancellation, even with no live feed", () => {
    const a = line2Train(230, "08:30")
    const b = line2Train(232, "08:50")
    const status = derive([a, b], timetable({ [b.tripKey]: { cancelled: true } }))
    const line = status.lines.find((l) => l.lineId === "2")!
    expect(line.level).toBe("severeDelays")
    expect(line.disruptions.map((d) => d.kind)).toEqual(["cancellations"])
    expect(line.disruptions[0].trains.map((t) => t.trainNumber)).toEqual([232])
    expect(line.trains).toMatchObject({ active: 2, cancelled: 1 })
    expect(status.realtime.available).toBe(false)
    expect(status.timetable).toEqual({ checkedAt: new Date(NOW_REAL).toISOString(), available: true })
  })

  test("stops gone from the timetable are skipped, an early end is a curtailment", () => {
    const a = line2Train(230, "08:30")
    const b = line2Train(232, "08:50")
    const status = derive([a, b], timetable({ [a.tripKey]: { skipped: [5000] }, [b.tripKey]: { curtailedTo: 5800 } }))
    const line = status.lines.find((l) => l.lineId === "2")!
    expect(line.disruptions.map((d) => [d.kind, d.section?.stationIds])).toEqual([
      ["curtailment", ["5900"]],
      ["skippedStops", ["5000"]],
    ])
  })

  test("an extra train is shown on its line without changing its level", () => {
    const a = line2Train(230, "08:30")
    const extra = line2Train(9876, "08:40")
    const status = derive([a], timetable({}, [{ trainNumber: 9876, serviceDate: DATE, stops: extra.stops }]))
    const line = status.lines.find((l) => l.lineId === "2")!
    expect(line.level).toBe("goodService")
    expect(line.disruptions).toHaveLength(1)
    expect(line.disruptions[0]).toMatchObject({ kind: "extraTrains", level: "goodService", source: "timetable" })
    expect(line.disruptions[0].trains[0]).toMatchObject({ trainNumber: 9876, status: "added", originStationId: "3500" })
    expect(line.trains.active).toBe(2)
  })

  test("a stale check is ignored, and the line is unknown again", () => {
    const a = line2Train(230, "08:30")
    const status = derive([a], timetable({ [a.tripKey]: { cancelled: true } }, [], NOW_REAL - 3_600_000))
    const line = status.lines.find((l) => l.lineId === "2")!
    expect(line.level).toBe("unknown")
    expect(status.timetable.available).toBe(false)
  })
})
