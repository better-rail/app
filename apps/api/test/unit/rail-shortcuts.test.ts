import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { mergePaateModiinTravels, withPaateModiinChanges } from "../../src/requests/rail-shortcuts"
import type { RailTimetableSearch } from "../../src/requests/rail-api"
import type { RailApiRouteItem, Train } from "../../src/types/rail-response"

const DATE = "2026-11-23"
const JERUSALEM = 680
const PAATE_MODIIN = 300
const AIRPORT = 8600
const UNIVERSITY = 3600
const HERZLIYA = 3500
const HOF_HACARMEL = 2300

const train = (trainNumber: number, from: number, to: number, departure: string, arrival: string): Train => ({
  trainNumber,
  orignStation: from,
  destinationStation: to,
  originPlatform: 1,
  destPlatform: 1,
  freeSeats: 100,
  departureTime: `${DATE}T${departure}:00`,
  arrivalTime: `${DATE}T${arrival}:00`,
  stopStations: [],
  handicap: 0,
  crowded: 0,
  trainPosition: null,
  routeStations: [],
})

const travel = (...trains: Train[]): RailApiRouteItem => ({
  departureTime: trains[0].departureTime,
  arrivalTime: trains[trains.length - 1].arrivalTime,
  freeSeats: 100,
  travelMessages: [],
  trains,
})

const summary = (travels: RailApiRouteItem[]) =>
  travels.map((t) => `${t.departureTime.slice(11, 16)} ${t.trains.map((x) => x.trainNumber).join("-")}`)

// The rail API's own answer for Jerusalem-Yitzhak Navon -> Hof HaCarmel, Monday 23 November 2026.
const rail = [
  travel(train(724, JERUSALEM, HERZLIYA, "08:56", "09:49"), train(406, HERZLIYA, HOF_HACARMEL, "10:00", "10:40")),
  travel(train(726, JERUSALEM, UNIVERSITY, "09:26", "10:12"), train(160, UNIVERSITY, HOF_HACARMEL, "10:32", "11:27")),
  travel(train(728, JERUSALEM, UNIVERSITY, "09:56", "10:42"), train(110, UNIVERSITY, HOF_HACARMEL, "11:02", "11:49")),
  travel(train(730, JERUSALEM, UNIVERSITY, "10:26", "11:12"), train(162, UNIVERSITY, HOF_HACARMEL, "11:32", "12:27")),
]

// The same search stitched at Pa'ate Modi'in (requests/rail-via.ts).
const viaPaateModiin = [
  travel(train(554, JERUSALEM, PAATE_MODIIN, "09:03", "09:18"), train(108, PAATE_MODIIN, HOF_HACARMEL, "09:25", "10:49")),
  travel(
    train(726, JERUSALEM, AIRPORT, "09:26", "09:46"),
    train(107, AIRPORT, PAATE_MODIIN, "09:48", "10:02"),
    train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49"),
  ),
  travel(train(558, JERUSALEM, PAATE_MODIIN, "10:03", "10:18"), train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49")),
]

describe("mergePaateModiinTravels", () => {
  test("adds the xx:03 change at Pa'ate Modi'in, in departure order", () => {
    const merged = summary(mergePaateModiinTravels(rail, viaPaateModiin))
    expect(merged).toContain("09:03 554-108")
    expect(merged).toContain("10:03 558-110")
    expect(merged).toEqual([...merged].sort())
  })

  test("keeps every rail API journey, even one the change beats", () => {
    // The 09:56 changes onto train 110 at Tel Aviv University; the 10:03 catches it
    // at Pa'ate Modi'in, leaving seven minutes later and arriving at the same minute.
    // Both stay: apps look up a saved ride on the 09:56 by its exact trains.
    const merged = summary(mergePaateModiinTravels(rail, viaPaateModiin))
    expect(merged).toContain("09:56 728-110")
    expect(merged).toContain("10:03 558-110")
    expect(merged).toEqual(expect.arrayContaining(summary(rail)))
  })

  test("adds only one train to Pa'ate Modi'in and one train on", () => {
    expect(summary(mergePaateModiinTravels(rail, viaPaateModiin))).not.toContain("09:26 726-107-110")
  })

  test("adds nothing the rail API already beats", () => {
    const slow = travel(
      train(554, JERUSALEM, PAATE_MODIIN, "09:03", "09:18"),
      train(999, PAATE_MODIIN, HOF_HACARMEL, "09:25", "11:30"),
    )
    expect(mergePaateModiinTravels(rail, [slow])).toBe(rail)
  })

  test("never drops a direct train", () => {
    const direct = travel(train(800, JERUSALEM, HOF_HACARMEL, "10:00", "11:55"))
    const change = travel(
      train(558, JERUSALEM, PAATE_MODIIN, "10:03", "10:18"),
      train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49"),
    )
    expect(summary(mergePaateModiinTravels([direct], [change]))).toEqual(["10:00 800", "10:03 558-110"])
  })
})

describe("withPaateModiinChanges", () => {
  const realFetch = globalThis.fetch
  const search: RailTimetableSearch = {
    fromStation: JERUSALEM,
    toStation: HOF_HACARMEL,
    date: DATE,
    hour: "08:00",
    scheduleType: "ByDeparture",
    languageId: "Hebrew",
  }
  const railResult = { result: { travels: rail } }

  beforeEach(() => {
    process.env.RAIL_URL = "https://rail-api.rail.co.il"
    process.env.RAIL_API_KEY = "key"
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  test("returns the rail API's answer as is when the extra search runs out of time", async () => {
    globalThis.fetch = mock(() => new Promise<Response>(() => {})) as unknown as typeof fetch
    const started = Date.now()
    expect(await withPaateModiinChanges(search, railResult, 50)).toBe(railResult)
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  test("leaves searches from anywhere but Jerusalem-Yitzhak Navon alone", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("no request expected"))) as unknown as typeof fetch
    expect(await withPaateModiinChanges({ ...search, fromStation: HOF_HACARMEL, toStation: JERUSALEM }, railResult)).toBe(
      railResult,
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
