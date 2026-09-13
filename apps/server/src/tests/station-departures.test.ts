import { describe, expect, test } from "bun:test"

import type { DayTrips, TripData } from "../requests/gtfs-route-api"
import type { SiriSnapshot } from "../siri/types"
import { deriveStationDepartures } from "../status/departures"
import { parseOffsetSec, toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-08-20"
const ts = (clock: string) => toEpochMs(DATE, parseOffsetSec(clock))

/** A trip calling at `stops` (station id, arrival clock), leaving each two minutes after it arrives. */
const trip = (trainNumber: number, stops: [number, string][], platform = 1): TripData => ({
  tripKey: `${DATE}#trip-${trainNumber}`,
  trainNumber,
  routeId: "r",
  stops: stops.map(([railId, clock]) => ({ railId, platform, arrTs: ts(clock), depTs: ts(clock) + 2 * 60_000 })),
})

const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

// Line 1's corridor: Nahariya (1600) … Akko (1500) … Haifa (2100) … Savidor (3700) … Modi'in (400).
const southbound = trip(104, [
  [1600, "10:00"],
  [1500, "10:10"],
  [2100, "10:40"],
  [3700, "11:30"],
])
const southboundLater = trip(106, [
  [1600, "10:30"],
  [1500, "10:40"],
  [2100, "11:10"],
  [3700, "12:00"],
])
const northbound = trip(103, [
  [3700, "09:00"],
  [2100, "09:50"],
  [1500, "10:20"],
  [1600, "10:30"],
])
// Ends at Akko: not a departure there.
const endsHere = trip(105, [
  [2100, "09:45"],
  [1500, "10:15"],
])
const gone = trip(102, [
  [1600, "09:00"],
  [1500, "09:10"],
  [2100, "09:40"],
])
const farAhead = trip(108, [
  [1600, "14:00"],
  [1500, "14:10"],
  [2100, "14:40"],
])

const now = { nowNaiveMs: ts("10:05"), nowRealMs: Date.parse("2026-08-20T07:05:00Z") }

describe("station departures", () => {
  test("the next trains through a station, per line and direction, soonest first, within the window", () => {
    const board = deriveStationDepartures({
      trips: table(southbound, southboundLater, northbound, endsHere, gone, farAhead),
      stationId: "1500",
      snapshot: null,
      ...now,
    })
    expect(board.schemaVersion).toBe(1)
    expect(board.stationId).toBe("1500")
    expect(board.realtime.available).toBe(false)
    expect(board.lines.map((l) => l.lineId)).toEqual(["1"])
    const [line] = board.lines
    expect(line.directions.map((d) => d.towardsStationId)).toEqual(["1600", "400"])
    const [north, south] = line.directions
    expect(north.trains.map((t) => t.trainNumber)).toEqual([103])
    expect(north.trains[0]).toMatchObject({
      time: "2026-08-20T10:20:00",
      platform: 1,
      destinationStationId: "1600",
      cancelled: false,
      live: false,
      delayMinutes: 0,
    })
    expect(south.trains.map((t) => t.trainNumber)).toEqual([104, 106])
    expect(south.trains[0].destinationStationId).toBe("3700")
  })

  test("live delays reorder the board, keep a late train on it, and mark cancellations and platforms", () => {
    const snapshot: SiriSnapshot = {
      updatedAt: now.nowRealMs - 20_000,
      feedId: "f",
      trains: {
        // Train 102 should have left at 09:10 but is an hour late: it is still to come, after 104.
        [`${DATE}#102`]: { routeId: "r", latestDelayMin: 62, stations: {} },
        [`${DATE}#104`]: {
          routeId: "r",
          latestDelayMin: 0,
          stations: { "1500": { delayMin: 0, platform: 2, status: "onTime" } },
        },
        [`${DATE}#103`]: { routeId: "r", latestDelayMin: 0, stations: {}, cancelled: true },
      },
    }
    const board = deriveStationDepartures({
      trips: table(southbound, southboundLater, northbound, gone),
      stationId: "1500",
      snapshot,
      ...now,
    })
    expect(board.realtime.available).toBe(true)
    const [north, south] = board.lines[0].directions
    expect(south.trains.map((t) => [t.trainNumber, t.delayMinutes, t.platform, t.live])).toEqual([
      [104, 0, 2, true],
      [102, 62, 1, true],
      [106, 0, 1, false],
    ])
    expect(north.trains[0]).toMatchObject({ trainNumber: 103, cancelled: true })
  })

  test("a stale snapshot is ignored", () => {
    const snapshot: SiriSnapshot = {
      updatedAt: now.nowRealMs - 2 * 60 * 60_000,
      feedId: "f",
      trains: { [`${DATE}#102`]: { routeId: "r", latestDelayMin: 62, stations: {} } },
    }
    const board = deriveStationDepartures({ trips: table(southbound, gone), stationId: "1500", snapshot, ...now })
    expect(board.realtime.available).toBe(false)
    expect(board.lines[0].directions[0].trains.map((t) => t.trainNumber)).toEqual([104])
  })

  test("Savidor lists departures, not arrivals, and a station nothing calls at has no lines", () => {
    const board = deriveStationDepartures({
      trips: table(
        trip(104, [
          [3700, "10:10"],
          [4600, "10:15"],
          [4900, "10:20"],
          [8600, "10:35"],
          [400, "11:00"],
        ]),
      ),
      stationId: "3700",
      snapshot: null,
      ...now,
    })
    expect(board.lines[0].directions[0].trains[0].time).toBe("2026-08-20T10:12:00")
    expect(deriveStationDepartures({ trips: table(southbound), stationId: "5800", snapshot: null, ...now }).lines).toEqual([])
  })
})
