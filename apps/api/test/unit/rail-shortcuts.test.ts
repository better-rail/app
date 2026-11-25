import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { mergePaateModiinTravels, paateModiinChanges } from "../../src/requests/rail-shortcuts"
import type { RailTimetableSearch } from "../../src/requests/rail-api"
import { searchTravels } from "../../src/requests/route-api"
import type { RailApiRouteItem, Train } from "../../src/types/rail-response"

const DATE = "2026-11-23"
const JERUSALEM = 680
const PAATE_MODIIN = 300
const UNIVERSITY = 3600
const HOF_HACARMEL = 2300

const train = (trainNumber: number, from: number, to: number, departure: string, arrival: string) =>
  ({
    trainNumber,
    orignStation: from,
    destinationStation: to,
    departureTime: `${DATE}T${departure}:00`,
    arrivalTime: `${DATE}T${arrival}:00`,
  }) as Train

const travel = (...trains: Train[]) =>
  ({ departureTime: trains[0].departureTime, arrivalTime: trains[trains.length - 1].arrivalTime, trains }) as RailApiRouteItem

const trainNumbers = (travels: RailApiRouteItem[]) => travels.map((t) => t.trains.map((x) => x.trainNumber).join("-"))

// The 09:56 changes onto train 110 at Tel Aviv University; the 10:03 catches the
// same train at Pa'ate Modi'in, leaving seven minutes later.
const rail = [travel(train(728, JERUSALEM, UNIVERSITY, "09:56", "10:42"), train(110, UNIVERSITY, HOF_HACARMEL, "11:02", "11:49"))]
const viaPaateModiin = [
  travel(train(558, JERUSALEM, PAATE_MODIIN, "10:03", "10:18"), train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49")),
]

const search: RailTimetableSearch = {
  fromStation: JERUSALEM,
  toStation: HOF_HACARMEL,
  date: DATE,
  hour: "08:00",
  scheduleType: "ByDeparture",
  languageId: "Hebrew",
}
const railResult = { result: { travels: rail } }
const realFetch = globalThis.fetch

beforeEach(() => {
  process.env.RAIL_URL = "https://rail-api.rail.co.il"
  process.env.RAIL_API_KEY = "key"
})
afterEach(() => {
  globalThis.fetch = realFetch
})

test("adds the Pa'ate Modi'in change and keeps the rail API journey it beats", () => {
  // Apps look up a saved ride on the 09:56 by its exact trains, so it has to stay.
  expect(trainNumbers(mergePaateModiinTravels(rail, viaPaateModiin))).toEqual(["728-110", "558-110"])
})

test("returns the rail API's answer as is when the extra search runs out of time", async () => {
  globalThis.fetch = mock(() => new Promise<Response>(() => {})) as unknown as typeof fetch
  expect(await paateModiinChanges(search, 50).addTo(railResult)).toBe(railResult)
})

test("leaves searches from anywhere but Jerusalem-Yitzhak Navon alone", async () => {
  globalThis.fetch = mock(() => Promise.reject(new Error("no request expected"))) as unknown as typeof fetch
  expect(await paateModiinChanges({ ...search, fromStation: HOF_HACARMEL, toStation: JERUSALEM }).addTo(railResult)).toBe(
    railResult,
  )
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

const platforms = (t: Train, origin: number, dest: number) => ({ ...t, originPlatform: origin, destPlatform: dest })
const leg = (...trains: Train[]) => ({ ...travel(...trains), freeSeats: 0, travelMessages: [] })
const toPaateModiin = [
  leg(platforms(train(558, JERUSALEM, PAATE_MODIIN, "10:03", "10:18"), 1, 3)),
  // Late enough that a change-station search would look past midnight for the next train on.
  leg(platforms(train(598, JERUSALEM, PAATE_MODIIN, "23:20", "23:35"), 1, 3)),
]
const onward = [leg(platforms(train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49"), 2, 1))]

/** Answers each rail API search from the fixtures above, and records it. */
const railApi = () => {
  const searched: RailTimetableSearch[] = []
  globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as RailTimetableSearch
    searched.push(body)
    const travels =
      body.toStation === PAATE_MODIIN ? toPaateModiin : body.fromStation === PAATE_MODIIN ? onward : rail
    return Response.json({ result: { travels } })
  }) as unknown as typeof fetch
  return searched
}

test("looks for the change alongside the rail API's own search, and never in the next day's timetable", async () => {
  const searched = railApi()

  const shortcuts = paateModiinChanges(search)
  await new Promise((resolve) => setTimeout(resolve, 0))
  // Both legs were asked for before the rail API's own answer came in.
  expect(searched).toHaveLength(2)

  const merged = await shortcuts.addTo(railResult)
  expect(trainNumbers(merged.result.travels)).toEqual(["728-110", "558-110"])
  expect(searched.map((s) => s.date)).toEqual([DATE, DATE])
})

describe("looking up a ride already chosen", () => {
  beforeEach(() => {
    process.env.RAIL_DATA_SOURCE = "rail"
  })
  afterEach(() => {
    delete process.env.RAIL_DATA_SOURCE
  })
  const lookUp = (trains: number[]) => searchTravels(JERUSALEM, HOF_HACARMEL, `${DATE}T08:00:00`, "he", { trains })

  test("skips the extra search when the rail API's own answer has the ride's trains", async () => {
    const searched = railApi()
    expect(trainNumbers(await lookUp([728, 110]))).toEqual(["728-110"])
    expect(searched).toHaveLength(1)
  })

  test("finds a ride on a Pa'ate Modi'in change", async () => {
    const searched = railApi()
    expect(trainNumbers(await lookUp([558, 110]))).toEqual(["728-110", "558-110"])
    expect(searched).toHaveLength(3)
  })
})
