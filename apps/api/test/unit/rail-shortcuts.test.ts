import { afterEach, beforeEach, expect, mock, test } from "bun:test"
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
  process.env.RAIL_DATA_SOURCE = "rail"
})
afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.RAIL_DATA_SOURCE
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

const toPaateModiin = [
  travel(train(558, JERUSALEM, PAATE_MODIIN, "10:03", "10:18")),
  // Late enough that a change-station search would look past midnight for the next train on.
  travel(train(598, JERUSALEM, PAATE_MODIIN, "23:20", "23:35")),
]
const onward = [travel(train(110, PAATE_MODIIN, HOF_HACARMEL, "10:25", "11:49"))]

/** Answers each rail API search from the fixtures above, and records it. */
const railApi = () => {
  const searched: RailTimetableSearch[] = []
  globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as RailTimetableSearch
    searched.push(body)
    const travels = body.toStation === PAATE_MODIIN ? toPaateModiin : body.fromStation === PAATE_MODIIN ? onward : rail
    return Response.json({ result: { travels } })
  }) as unknown as typeof fetch
  return searched
}

test("starts the extra search before the rail API's own answer comes in", async () => {
  const searched = railApi()
  paateModiinChanges(search)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(searched).toHaveLength(2)
})

const lookUpRide = (trains: number[]) => searchTravels(JERUSALEM, HOF_HACARMEL, `${DATE}T08:00:00`, "he", { trains })

test("a ride lookup skips the extra search when the rail API's answer has the ride's trains", async () => {
  const searched = railApi()
  expect(trainNumbers(await lookUpRide([728, 110]))).toEqual(["728-110"])
  expect(searched).toHaveLength(1)
})

test("a ride lookup finds a ride on a Pa'ate Modi'in change, without looking into the next day", async () => {
  const searched = railApi()
  expect(trainNumbers(await lookUpRide([558, 110]))).toEqual(["728-110", "558-110"])
  expect(searched).toHaveLength(3)
})
