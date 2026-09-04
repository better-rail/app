import { describe, expect, test } from "bun:test"
import { belongsToRequestedDay, formatTravels, nextRouteIndex, summarizeRoutes, isRouteInThePast } from "./route-format"
import { parseNaive } from "@/lib/time"
import type { ApiTravel } from "./types"

const train = (
  number: number,
  from: number,
  to: number,
  dep: string,
  arr: string,
  extras: Partial<ApiTravel["trains"][number]> = {},
) => ({
  trainNumber: number,
  orignStation: from,
  destinationStation: to,
  originPlatform: 1,
  destPlatform: 2,
  freeSeats: 0,
  departureTime: dep,
  arrivalTime: arr,
  stopStations: [
    { stationId: 4600, arrivalTime: "2026-09-05T08:30:00", departureTime: "2026-09-05T08:31:00", platform: 3, crowded: 0 },
  ],
  handicap: 0,
  crowded: 0,
  trainPosition: { calcDiffMinutes: 0 },
  routeStations: [
    { stationId: from, arrivalTime: "08:24", crowded: 0, platform: 1 },
    { stationId: 4600, arrivalTime: "08:30", crowded: 0, platform: 3 },
    { stationId: to, arrivalTime: "09:00", crowded: 0, platform: 2 },
  ],
  visaWagonData: null,
  ...extras,
})

const travel = (trains: ApiTravel["trains"]): ApiTravel => ({
  departureTime: trains[0].departureTime,
  arrivalTime: trains[trains.length - 1].arrivalTime,
  freeSeats: 0,
  travelMessages: [],
  trains,
})

describe("formatTravels", () => {
  test("normalises trains, flags exchanges and computes durations", () => {
    const routes = formatTravels(
      [
        travel([train(100, 3700, 680, "2026-09-05T08:24:00", "2026-09-05T09:00:00")]),
        travel([
          train(200, 3700, 4600, "2026-09-05T08:40:00", "2026-09-05T08:50:00"),
          train(201, 4600, 680, "2026-09-05T08:58:00", "2026-09-05T09:50:00", { trainPosition: { calcDiffMinutes: 5 } }),
        ]),
      ],
      "2026-09-05",
    )
    expect(routes).toHaveLength(2)
    expect(routes[0].id).toBe(`100-${parseNaive("2026-09-05T08:24:00")}`)
    expect(routes[0].durationMs).toBe(36 * 60_000)
    expect(routes[0].isExchange).toBe(false)
    expect(routes[0].trains[0].stopStations[0].stationId).toBe("4600")
    expect(routes[0].trains[0].lastStopId).toBe("680")
    expect(routes[1].isExchange).toBe(true)
    expect(routes[1].trains[1].delay).toBe(5)
    // the 70-minute exchange route is much longer than the 36-minute direct one leaving within the hour
    expect(routes[1].isMuchLonger).toBe(true)
    expect(routes[0].isMuchShorter).toBe(true)
  })

  test("drops trains from other days but keeps the small hours of the next day", () => {
    expect(belongsToRequestedDay(parseNaive("2026-09-05T23:59:00"), "2026-09-05")).toBe(true)
    expect(belongsToRequestedDay(parseNaive("2026-09-06T01:30:00"), "2026-09-05")).toBe(true)
    expect(belongsToRequestedDay(parseNaive("2026-09-06T02:00:00"), "2026-09-05")).toBe(false)
    expect(belongsToRequestedDay(parseNaive("2026-09-04T23:00:00"), "2026-09-05")).toBe(false)
  })

  test("real-time flags", () => {
    const [route] = formatTravels(
      [
        travel([
          train(300, 3700, 680, "2026-09-05T08:24:00", "2026-09-05T09:00:00", {
            isCancelled: true,
            actualLastStationId: 4600,
            routeStations: [
              { stationId: 3700, arrivalTime: "08:24", crowded: 0, platform: 1, cancelled: true },
              { stationId: 680, arrivalTime: "09:00", crowded: 0, platform: 2 },
            ],
          }),
        ]),
      ],
      "2026-09-05",
    )
    expect(route.isCancelled).toBe(true)
    expect(route.trains[0].originCancelled).toBe(true)
    expect(route.trains[0].lastStopId).toBe("4600")
    expect(route.trains[0].isLastStopChanged).toBe(true)
  })
})

describe("helpers", () => {
  const routes = formatTravels(
    [
      travel([train(1, 3700, 680, "2026-09-05T08:00:00", "2026-09-05T08:40:00")]),
      travel([train(2, 3700, 680, "2026-09-05T09:00:00", "2026-09-05T09:40:00")]),
      travel([train(3, 3700, 680, "2026-09-05T10:00:00", "2026-09-05T10:40:00")]),
    ],
    "2026-09-05",
  )

  test("nextRouteIndex picks the first train that has not left", () => {
    expect(nextRouteIndex(routes, parseNaive("2026-09-05T08:30:00"))).toBe(1)
    expect(nextRouteIndex(routes, parseNaive("2026-09-05T12:00:00"))).toBe(2)
    expect(isRouteInThePast(routes[0], parseNaive("2026-09-05T08:41:00"))).toBe(true)
  })

  test("summarizeRoutes", () => {
    const summary = summarizeRoutes(routes)!
    expect(summary.count).toBe(3)
    expect(summary.directCount).toBe(3)
    expect(summary.medianDurationMs).toBe(40 * 60_000)
    expect(summarizeRoutes([])).toBeNull()
  })
})
