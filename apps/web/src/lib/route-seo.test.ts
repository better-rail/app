import { describe, expect, test } from "bun:test"
import { getStationById } from "@/data/stations"
import { parseNaive } from "@/lib/time"
import { heroContent, heroImagePath, routeSeoText, tripFacts, type TripFacts } from "./route-seo"
import { formatTravels } from "./api/route-format"

const hadera = getStationById("3100")!
const university = getStationById("3600")!

const trip: TripFacts = {
  id: "7220-7155",
  date: "2026-09-05",
  trainNumbers: [7220, 7155],
  departureTime: parseNaive("2026-09-05T20:56:00"),
  arrivalTime: parseNaive("2026-09-05T21:25:00"),
  durationMs: 29 * 60_000,
  changes: 1,
  platform: 2,
}

describe("routeSeoText", () => {
  test("a journey: the route's short title, and what the rider needs in the description", () => {
    expect(routeSeoText({ locale: "he", origin: hadera, destination: university, trip })).toEqual({
      title: "חדרה - מערב ← תל אביב - אוניברסיטה | Better Rail",
      description: "רכבת 7220, 7155 · 20:56 ← 21:25 · 29 דקות · החלפה אחת · רציף 2",
    })
    expect(routeSeoText({ locale: "en", origin: hadera, destination: university, trip })).toEqual({
      title: "Hadera - West → Tel Aviv - University | Better Rail",
      description: "Train 7220, 7155 · 20:56 → 21:25 · 29 min · 1 change · Platform 2",
    })
  })

  test("a journey: direct, several changes, no platform yet", () => {
    const direct = { ...trip, trainNumbers: [7220], changes: 0, platform: 0, durationMs: 80 * 60_000 }
    expect(routeSeoText({ locale: "he", origin: hadera, destination: university, trip: direct }).description).toBe(
      "רכבת 7220 · 20:56 ← 21:25 · שעה ו-20 דקות · ללא החלפות",
    )
    const two = { ...trip, trainNumbers: [7220, 7155, 6012], changes: 2 }
    expect(routeSeoText({ locale: "en", origin: hadera, destination: university, trip: two }).description).toBe(
      "Train 7220, 7155, 6012 · 20:56 → 21:25 · 29 min · 2 changes · Platform 2",
    )
  })

  test("the route: a short blurb, with the typical journey time when the timetable is in", () => {
    const summary = {
      count: 7,
      directCount: 3,
      firstDeparture: 0,
      lastDeparture: 0,
      medianDurationMs: 29 * 60_000,
      minDurationMs: 0,
    }
    expect(routeSeoText({ locale: "he", origin: hadera, destination: university, summary })).toEqual({
      title: "חדרה - מערב ← תל אביב - אוניברסיטה | Better Rail",
      description: "כ-29 דקות נסיעה · זמני יציאה והגעה, החלפות, רציפים ועיכובים בזמן אמת.",
    })
    expect(routeSeoText({ locale: "en", origin: hadera, destination: university, summary }).description).toBe(
      "About 29 min by train · Departure and arrival times, changes, platforms and live delays.",
    )
    expect(
      routeSeoText({
        locale: "he",
        origin: hadera,
        destination: university,
        summary: { ...summary, medianDurationMs: 80 * 60_000 },
      }).description,
    ).toBe("כשעה ו-20 דקות נסיעה · זמני יציאה והגעה, החלפות, רציפים ועיכובים בזמן אמת.")
    expect(routeSeoText({ locale: "en", origin: hadera, destination: university }).description).toBe(
      "Departure and arrival times, changes, platforms and live delays.",
    )
  })

  test("the route on a day the link asks for", () => {
    const requested = { date: "2026-09-07", time: "08:30" }
    expect(routeSeoText({ locale: "he", origin: hadera, destination: university, requested }).description).toBe(
      "רכבות ביום שני, 7 בספטמבר מ-08:30 · זמני יציאה והגעה, החלפות, רציפים ועיכובים בזמן אמת.",
    )
    expect(
      routeSeoText({ locale: "en", origin: hadera, destination: university, requested: { date: "2026-09-07" } }).description,
    ).toBe("Trains on Monday 7 September · Departure and arrival times, changes, platforms and live delays.")
  })
})

describe("heroImagePath", () => {
  test("names the route, the language and — for a journey — its day and trains", () => {
    expect(heroImagePath(hadera, university, "he")).toBe("/og/routes/3100/3600.jpg?lang=he")
    expect(heroImagePath(hadera, university, "en", trip)).toBe("/og/routes/3100/3600.jpg?lang=en&date=2026-09-05&trip=7220-7155")
  })
})

describe("heroContent", () => {
  test("the copy set on the picture", () => {
    expect(heroContent({ locale: "he", origin: hadera, destination: university, trip, photo: "data:x" })).toEqual({
      locale: "he",
      origin: "חדרה - מערב",
      destination: "תל אביב - אוניברסיטה",
      tagline: "זמני רכבת, רציפים ועיכובים בזמן אמת",
      photo: "data:x",
      trip: { departure: "20:56", arrival: "21:25", facts: "29 דק׳ · החלפה אחת · רציף 2" },
    })
    expect(
      heroContent({ locale: "en", origin: hadera, destination: university, trip: { ...trip, changes: 2 } }).trip?.facts,
    ).toBe("29 min · 2 changes · Platform 2")
    const route = heroContent({ locale: "en", origin: hadera, destination: university })
    expect(route.trip).toBeUndefined()
    expect(route.tagline).toBe("Train times, platforms and live delays")
  })
})

describe("tripFacts", () => {
  test("counts the changes and reads the departure platform off the journey", () => {
    const [route] = formatTravels(
      [
        {
          departureTime: "2026-09-05T20:56:00",
          arrivalTime: "2026-09-05T21:25:00",
          freeSeats: 0,
          travelMessages: [],
          trains: [
            {
              trainNumber: 7220,
              orignStation: 3100,
              destinationStation: 2800,
              originPlatform: 2,
              destPlatform: 1,
              freeSeats: 0,
              arrivalTime: "2026-09-05T21:05:00",
              departureTime: "2026-09-05T20:56:00",
              stopStations: [],
              handicap: 0,
              crowded: 0,
              trainPosition: null,
              routeStations: [],
            },
            {
              trainNumber: 7155,
              orignStation: 2800,
              destinationStation: 3600,
              originPlatform: 3,
              destPlatform: 4,
              freeSeats: 0,
              arrivalTime: "2026-09-05T21:25:00",
              departureTime: "2026-09-05T21:08:00",
              stopStations: [],
              handicap: 0,
              crowded: 0,
              trainPosition: null,
              routeStations: [],
            },
          ],
        },
      ],
      "2026-09-05",
    )
    expect(tripFacts(route, "2026-09-05")).toEqual(trip)
  })
})
