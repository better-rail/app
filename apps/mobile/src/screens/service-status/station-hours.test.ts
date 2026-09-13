import { describe, expect, test } from "bun:test"
import type { StationEntrance, StationHours } from "@/services/api"
import { dayRangeLabel, entranceOpenBadge, hoursOfKind, stationOpenState, wallClockOf } from "./station-hours"

const hours = (days: number[], opens: string | null, closes: string | null, extra: Partial<StationHours> = {}): StationHours => ({
  kind: "entrance",
  days,
  opens,
  closes,
  allDay: false,
  closed: false,
  note: null,
  ...extra,
})

const entrance = (rows: StationHours[], id = 1): StationEntrance => ({
  id,
  name: `Entrance ${id}`,
  address: null,
  location: null,
  hours: rows,
  services: [],
  inactiveElevators: null,
})

/** Tel Aviv HaShalom's northern entrance: weekdays to past midnight, Friday afternoon, Saturday night. */
const hashalom = entrance([
  hours([1, 2, 3, 4, 5], "04:45", "00:15"),
  hours([6], "04:30", "16:00"),
  hours([7], "20:15", "01:30"),
  // The ticket office does not count towards the station being open.
  hours([1, 2, 3, 4, 5], "06:00", "22:00", { kind: "ticketOffice" }),
])

const at = (day: number, clock: string) => {
  const [h, m] = clock.split(":").map(Number)
  return { day, minutes: h * 60 + m }
}

describe("station open state", () => {
  test("open during the day, until the entrance closes", () => {
    expect(stationOpenState([hashalom], at(2, "12:00"))).toEqual({ state: "open", until: "00:15" })
    expect(stationOpenState([hashalom], at(6, "10:00"))).toEqual({ state: "open", until: "16:00" })
  })

  test("a span past midnight is still open in the small hours of the next day", () => {
    expect(stationOpenState([hashalom], at(3, "00:10"))).toEqual({ state: "open", until: "00:15" })
    expect(stationOpenState([hashalom], at(1, "01:00"))).toEqual({ state: "open", until: "01:30" }) // Saturday night's trains, early Sunday
    expect(stationOpenState([hashalom], at(3, "00:20"))).toEqual({ state: "closed", opensAt: { day: 3, time: "04:45" } })
  })

  test("closed on Shabbat until Saturday night, and on Friday night until Sunday's Saturday-night span", () => {
    expect(stationOpenState([hashalom], at(7, "12:00"))).toEqual({ state: "closed", opensAt: { day: 7, time: "20:15" } })
    expect(stationOpenState([hashalom], at(6, "18:00"))).toEqual({ state: "closed", opensAt: { day: 7, time: "20:15" } })
  })

  test("around the clock, closed all day, and the latest of several entrances", () => {
    const allDay = entrance(
      [hours([1, 2, 3, 4, 5], null, null, { allDay: true }), hours([6, 7], null, null, { closed: true })],
      2,
    )
    expect(stationOpenState([allDay], at(1, "03:00"))).toEqual({ state: "open", until: null })
    expect(stationOpenState([allDay], at(6, "03:00"))).toEqual({ state: "closed", opensAt: { day: 1, time: "00:00" } })

    const early = entrance([hours([1, 2, 3, 4, 5], "05:00", "20:00")], 3)
    const late = entrance([hours([1, 2, 3, 4, 5], "07:00", "23:00")], 4)
    expect(stationOpenState([early, late], at(1, "06:00"))).toEqual({ state: "open", until: "20:00" })
    expect(stationOpenState([early, late], at(1, "12:00"))).toEqual({ state: "open", until: "23:00" })
    expect(stationOpenState([early, late], at(1, "22:00"))).toEqual({ state: "open", until: "23:00" })
    expect(stationOpenState([early, late], at(1, "23:30"))).toEqual({ state: "closed", opensAt: { day: 2, time: "05:00" } })
  })

  test("no entrance hours at all: unknown", () => {
    expect(stationOpenState([], at(1, "12:00"))).toEqual({ state: "unknown" })
    expect(stationOpenState([entrance([hours([1], "06:00", "22:00", { kind: "ticketOffice" })])], at(1, "12:00"))).toEqual({
      state: "unknown",
    })
  })

  test("a wall clock from a Date's local fields", () => {
    expect(wallClockOf(new Date(2026, 8, 13, 9, 5))).toEqual({ day: 1, minutes: 545 }) // Sunday 13 Sep 2026
  })
})

describe("hours labels", () => {
  const names = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayName = (day: number) => names[day]

  test("days fold into ranges", () => {
    expect(dayRangeLabel([1, 2, 3, 4, 5], dayName)).toBe("Sun–Thu")
    expect(dayRangeLabel([6], dayName)).toBe("Fri")
    expect(dayRangeLabel([6, 7], dayName)).toBe("Fri–Sat")
    expect(dayRangeLabel([1, 3, 4, 5, 7], dayName)).toBe("Sun, Tue–Thu, Sat")
    expect(dayRangeLabel([], dayName)).toBe("")
  })

  test("the rows of one kind come in the order of the week", () => {
    const rows = hoursOfKind(
      entrance([hours([7], "20:15", "01:30"), hours([1, 2, 3, 4, 5], "04:45", "00:15"), hours([6], "04:30", "16:00")]),
      "entrance",
    )
    expect(rows.map((r) => r.days[0])).toEqual([1, 6, 7])
    expect(hoursOfKind(hashalom, "ticketOffice")).toHaveLength(1)
    expect(hoursOfKind(hashalom, "customerService")).toHaveLength(0)
  })
})

describe("entranceOpenBadge", () => {
  test("open well before closing", () => {
    expect(entranceOpenBadge(hashalom, { day: 2, minutes: 12 * 60 })).toBe("open")
  })

  test("closing soon within half an hour of closing, across midnight too", () => {
    expect(entranceOpenBadge(hashalom, { day: 6, minutes: 15 * 60 + 31 })).toBe("closingSoon")
    expect(entranceOpenBadge(hashalom, { day: 6, minutes: 15 * 60 + 30 })).toBe("closingSoon")
    expect(entranceOpenBadge(hashalom, { day: 6, minutes: 15 * 60 + 29 })).toBe("open")
    expect(entranceOpenBadge(hashalom, { day: 2, minutes: 23 * 60 + 50 })).toBe("closingSoon")
    expect(entranceOpenBadge(hashalom, { day: 3, minutes: 5 })).toBe("closingSoon")
  })

  test("closed outside the hours", () => {
    expect(entranceOpenBadge(hashalom, { day: 7, minutes: 12 * 60 })).toBe("closed")
    expect(entranceOpenBadge(hashalom, { day: 6, minutes: 16 * 60 })).toBe("closed")
  })

  test("around the clock never closes soon", () => {
    expect(
      entranceOpenBadge(entrance([hours([1, 2, 3, 4, 5, 6, 7], null, null, { allDay: true })]), {
        day: 1,
        minutes: 23 * 60 + 59,
      }),
    ).toBe("open")
  })

  test("no hours, no badge", () => {
    expect(entranceOpenBadge(entrance([]), { day: 1, minutes: 600 })).toBeUndefined()
  })
})
