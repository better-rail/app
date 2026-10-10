import { describe, expect, test } from "bun:test"

import { type RailStationInfo, clockOf, htmlToText, normalizeHours, normalizeStationInfo } from "../requests/station-info"

/** A row of the page's hours table, as the API sends it, with the fields that matter overridden. */
const row = (overrides: Record<string, unknown>) => ({
  activityHoursType: 1,
  isClosedShortText: "",
  isClosedLongText: "",
  activityDaysNumbers: "1,2,3,4,5",
  startHourTextKey: null,
  startHour: "05:00",
  startHourReplaceTextKey: null,
  endHourPrefixTextKey: null,
  endHour: "22:30",
  endHourReplaceTextKey: null,
  endHourPostfixTextKey: null,
  activityHoursReplaceTextKey: null,
  ...overrides,
})

/** Tel Aviv Savidor's page, trimmed to the shape the normaliser reads. */
const savidor: RailStationInfo = {
  stationUpdates: [
    {
      updateId: "a350cdfd",
      date: "01.05.2025",
      updateHeader: "Starting Sunday, 12.7.26, the northern entrance opens 05:00 - 22:30.",
      updateContent: "",
      updateLink: "https://www.rail.co.il?page=stationinfo&stationname=3700",
      updateType: "Special",
    },
    { updateId: null, date: null, updateHeader: "", updateContent: "", updateLink: null, updateType: "Special" },
  ],
  stationDetails: {
    stationId: 3700,
    stationName: "Tel Aviv - Savidor Center",
    carParking: "Dedicated parking lot for train passengers available",
    parkingCosts: null,
    bikeParking: "",
    bikeParkingCosts: "Free",
    nonActiveElevators: null,
    stationIsClosed: false,
    stationIsClosedUntill: "0001-01-01T00:00:00",
    stationIsClosedText: null,
  },
  gateInfo: [
    {
      stationGateId: 642,
      gateName: "Tel Aviv Entrance",
      gateAddress: null,
      gateLatitude: 32.083419,
      gateLontitude: 34.797126,
      gateActivityHours: [
        row({ activityHoursType: 3, startHour: "07:00", endHour: "19:00" }),
        row({
          activityHoursType: 2,
          activityDaysNumbers: "7",
          startHour: "00:00",
          endHour: "00:00",
          activityHoursReplaceTextKey: "Closed",
        }),
        row({ startHour: "00:00", endHour: "23:59", activityHoursReplaceTextKey: "24 hours" }),
        row({ activityDaysNumbers: "6", startHour: "00:00", endHour: "16:10" }),
        row({ activityDaysNumbers: "7", startHour: "20:15", endHour: "00:00" }),
        row({ activityHoursType: 9 }),
      ],
      gateServices: [{ serviceName: "Ticket machines" }, { serviceName: "Public toilets" }, { serviceName: "Ticket machines" }],
      nonActiveElavators: "",
    },
    {
      stationGateId: 736,
      gateName: "Stock Exchange Entrance",
      gateAddress: "Stock Exchange Entrance",
      gateLatitude: 0,
      gateLontitude: 0,
      gateActivityHours: [row({ endHour: "00:30", endHourPostfixTextKey: "intermittently" })],
      gateServices: [],
      nonActiveElavators: null,
    },
  ],
}

describe("station info", () => {
  test("the page becomes the contract: entrances with their hours, facilities, notices and parking", () => {
    const info = normalizeStationInfo(savidor, "3700", "en", new Date("2026-09-13T12:00:00Z"))

    expect(info.schemaVersion).toBe(1)
    expect(info.stationId).toBe("3700")
    expect(info.locale).toBe("en")
    expect(info.name).toBe("Tel Aviv - Savidor Center")
    expect(info.closed).toBeNull()
    expect(info.link).toBe("https://www.rail.co.il/?page=stationinfo&stationname=3700")
    expect(info.fetchedAt).toBe("2026-09-13T12:00:00.000Z")

    // An empty notice is dropped.
    expect(info.notices).toHaveLength(1)
    expect(info.notices[0]).toEqual({
      id: "a350cdfd",
      date: "01.05.2025",
      header: "Starting Sunday, 12.7.26, the northern entrance opens 05:00 - 22:30.",
      content: "",
      link: "https://www.rail.co.il?page=stationinfo&stationname=3700",
      type: "Special",
    })

    expect(info.parking).toEqual({
      car: "Dedicated parking lot for train passengers available",
      carCost: null,
      bike: null,
      bikeCost: "Free",
    })

    expect(info.entrances).toHaveLength(2)
    const [main, exchange] = info.entrances
    expect(main.name).toBe("Tel Aviv Entrance")
    expect(main.location).toEqual({ lat: 32.083419, lon: 34.797126 })
    expect(main.services).toEqual(["Ticket machines", "Public toilets"])
    expect(main.inactiveElevators).toBeNull()
    // The unknown activity type is dropped; the others keep their kinds.
    expect(main.hours.map((h) => h.kind)).toEqual(["customerService", "ticketOffice", "entrance", "entrance", "entrance"])

    // No coordinates: no location. The address is kept.
    expect(exchange.location).toBeNull()
    expect(exchange.address).toBe("Stock Exchange Entrance")
    expect(exchange.hours[0]).toEqual({
      kind: "entrance",
      days: [1, 2, 3, 4, 5],
      opens: "05:00",
      closes: "00:30",
      allDay: false,
      closed: false,
      note: "intermittently",
    })
  })

  test("hours: around the clock, closed, and a span past midnight", () => {
    expect(normalizeHours(row({ startHour: "00:00", endHour: "23:59", activityHoursReplaceTextKey: "24 hours" }))).toMatchObject({
      allDay: true,
      closed: false,
      opens: null,
      closes: null,
      note: null,
    })
    expect(normalizeHours(row({ activityHoursReplaceTextKey: "24 שעות " }))).toMatchObject({ allDay: true })
    expect(
      normalizeHours(
        row({ activityDaysNumbers: "7", startHour: "00:00", endHour: "00:00", activityHoursReplaceTextKey: "סגור" }),
      ),
    ).toMatchObject({
      days: [7],
      closed: true,
      opens: null,
      closes: null,
      note: null,
    })
    expect(normalizeHours(row({ activityHoursReplaceTextKey: "Закрыта" }))).toMatchObject({ closed: true })
    expect(normalizeHours(row({ activityHoursReplaceTextKey: "مغلقة" }))).toMatchObject({ closed: true })
    // 00:00–00:00 with no words is an empty span: closed.
    expect(normalizeHours(row({ startHour: "00:00", endHour: "00:00" }))).toMatchObject({ closed: true })
    // Saturday night: opens after Shabbat, closes past midnight.
    expect(normalizeHours(row({ activityDaysNumbers: "7", startHour: "20:15", endHour: "01:30" }))).toMatchObject({
      days: [7],
      opens: "20:15",
      closes: "01:30",
      closed: false,
    })
    // Days are sorted and de-duplicated; a row with none is dropped.
    expect(normalizeHours(row({ activityDaysNumbers: "6,7,6" }))?.days).toEqual([6, 7])
    expect(normalizeHours(row({ activityDaysNumbers: "" }))).toBeNull()
  })

  test("clock strings and HTML are tidied", () => {
    expect(clockOf("7:05")).toBe("07:05")
    expect(clockOf("07:05:00")).toBe("07:05")
    expect(clockOf("25:00")).toBeNull()
    expect(clockOf(null)).toBeNull()
    expect(htmlToText("<p>One&nbsp;&amp; two</p><p>Three<br/>four</p>")).toBe("One & two\n\nThree\nfour")
    expect(htmlToText("  <div>​x</div>  ")).toBe("x")
  })

  test("a closed station carries until when, and the page's words", () => {
    const closed = normalizeStationInfo(
      {
        ...savidor,
        stationDetails: {
          ...savidor.stationDetails!,
          stationIsClosed: true,
          stationIsClosedUntill: "2026-10-01T00:00:00",
          stationIsClosedText: "Closed for works",
        },
      },
      "3700",
      "en",
    )
    expect(closed.closed?.text).toBe("Closed for works")
    expect(closed.closed?.until).toMatch(/^2026-(09-30|10-01)T/)
  })
})
