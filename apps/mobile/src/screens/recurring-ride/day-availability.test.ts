import { describe, expect, test } from "bun:test"
import { hasTrainAround, weekdayDepartures } from "./day-availability"

describe("weekdayDepartures", () => {
  // Thursday 12 Nov 2026, 15:00
  const now = new Date(2026, 10, 12, 15, 0)

  test("lands each weekday on its next date, today included, at the departure time", () => {
    const departures = weekdayDepartures(now, "10:39").map((time) => new Date(time))
    expect(departures.map((date) => date.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(departures[4].getDate()).toBe(12)
    expect(departures[5].getDate()).toBe(13)
    expect(departures[3].getDate()).toBe(18)
    expect(departures[0].getHours()).toBe(10)
    expect(departures[0].getMinutes()).toBe(39)
  })

  test("a week ahead is the same weekday seven days later", () => {
    const thisWeek = weekdayDepartures(now, "07:00")
    const nextWeek = weekdayDepartures(now, "07:00", 1)
    expect(new Date(nextWeek[5]).getDate()).toBe(new Date(thisWeek[5]).getDate() + 7)
  })
})

describe("hasTrainAround", () => {
  const departureAt = new Date(2026, 10, 15, 10, 39).getTime()
  const at = (minutes: number) => ({ departureTime: departureAt + minutes * 60_000 })

  test("matches a train within five minutes either way", () => {
    expect(hasTrainAround([at(-5)], departureAt)).toBe(true)
    expect(hasTrainAround([at(4)], departureAt)).toBe(true)
  })

  test("doesn't match trains further away, or no trains", () => {
    expect(hasTrainAround([at(-6), at(20)], departureAt)).toBe(false)
    expect(hasTrainAround([], departureAt)).toBe(false)
  })
})
