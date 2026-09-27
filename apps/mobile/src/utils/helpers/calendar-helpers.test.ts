import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import i18n from "i18n-js"
import en from "@/i18n/en.json"
import he from "@/i18n/he.json"
import ar from "@/i18n/ar.json"
import ru from "@/i18n/ru.json"
import { getE2ERoutes } from "@/services/api/e2e-route-fixtures"

mock.module("expo-calendar", () => ({}))

const { createEventConfig } = require("./calendar-helpers") as typeof import("./calendar-helpers")

const translations = { en, he, ar, ru }
let translationSpy: ReturnType<typeof spyOn>

function useLanguage(locale: keyof typeof translations) {
  translationSpy = spyOn(i18n, "t").mockImplementation((key, options = {}) => {
    const path = Array.isArray(key) ? key : key.split(".")
    const template = path.reduce((value, part) => value[part], translations[locale] as any) as string
    return template.replace(/%\{(\w+)\}/g, (_, name) => String(options[name]))
  })
}

afterEach(() => translationSpy?.mockRestore())

function routes() {
  return getE2ERoutes("680", "4600", "2026-09-08", "08:00")
}

describe("createEventConfig", () => {
  test("keeps a direct ride's notes and overall event details", () => {
    useLanguage("en")
    const [route] = routes()
    const train = route.trains[0]

    expect(createEventConfig(route)).toEqual({
      title: `Ride to ${train.destinationStationName}`,
      startDate: new Date(route.departureTime).toISOString(),
      endDate: new Date(route.arrivalTime).toISOString(),
      location: `${train.originStationName} Train Station`,
      notes: `Train No. ${train.trainNumber} from ${train.originStationName} to ${train.destinationStationName}`,
    })
  })

  test("describes both trains and the change station instead of a direct ride", () => {
    useLanguage("en")
    const [, route] = routes()
    const [first, second] = route.trains
    const event = createEventConfig(route)

    expect(event.notes).toBe(
      `Train No. ${first.trainNumber} from ${first.originStationName} to ${first.destinationStationName}\n` +
        `Change at ${second.originStationName}\n` +
        `Train No. ${second.trainNumber} from ${second.originStationName} to ${second.destinationStationName}`,
    )
    expect(event.notes).not.toContain(
      `Train No. ${first.trainNumber} from ${first.originStationName} to ${second.destinationStationName}`,
    )
    expect(event.title).toBe(`Ride to ${second.destinationStationName}`)
    expect(event.startDate).toBe(new Date(route.departureTime).toISOString())
    expect(event.endDate).toBe(new Date(route.arrivalTime).toISOString())
    expect(event.location).toBe(`${first.originStationName} Train Station`)
  })

  test("includes every leg and change in travel order for multiple transfers", () => {
    useLanguage("en")
    const [, route] = routes()
    const first = { ...route.trains[0], originStationName: "Origin", destinationStationName: "First change" }
    const second = { ...route.trains[1], originStationName: "First change", destinationStationName: "Second change" }
    const third = {
      ...second,
      trainNumber: 999,
      originStationName: "Second change",
      destinationStationName: "Destination",
      departureTime: second.arrivalTime + 5 * 60_000,
      arrivalTime: second.arrivalTime + 30 * 60_000,
    }
    const event = createEventConfig({ ...route, trains: [first, second, third], arrivalTime: third.arrivalTime })

    expect(event.notes).toBe(
      `Train No. ${first.trainNumber} from Origin to First change\n` +
        `Change at First change\n` +
        `Train No. ${second.trainNumber} from First change to Second change\n` +
        `Change at Second change\n` +
        `Train No. 999 from Second change to Destination`,
    )
    expect(event.title).toBe("Ride to Destination")
    expect(event.endDate).toBe(new Date(third.arrivalTime).toISOString())
  })

  test.each(["en", "he", "ar", "ru"] as const)("uses localized leg and transfer descriptions in %s", (locale) => {
    useLanguage(locale)
    const [, route] = routes()
    const [first, second] = route.trains
    const lines = createEventConfig(route).notes.split("\n")

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain(String(first.trainNumber))
    expect(lines[0]).toContain(first.originStationName)
    expect(lines[0]).toContain(first.destinationStationName)
    expect(lines[1]).toBe(`${translations[locale].routeDetails.changeAt}${second.originStationName}`)
    expect(lines[2]).toContain(String(second.trainNumber))
    expect(lines[2]).toContain(second.originStationName)
    expect(lines[2]).toContain(second.destinationStationName)
  })

  test("rejects routes without trains", () => {
    const [route] = routes()
    expect(() => createEventConfig({ ...route, trains: [] })).toThrow("No trains found in routeItem")
  })
})
