import { describe, expect, test } from "bun:test"
import { getRailLine, type RailLineId } from "@/data/rail-lines"
import type {
  AffectedTrain,
  Disruption,
  LineStatus,
  ServiceStatusLevel,
  ServiceStatusSnapshot,
  StationDeparture,
  StationDepartures,
} from "@/services/api"
import { linesCallingAt, nextTrainsLevel, stationDisruptions, stationStatus, stationStatusKind } from "./station-status"

const lineStatus = (lineId: RailLineId, level: ServiceStatusLevel, disruptions: Disruption[] = []): LineStatus => {
  const line = getRailLine(lineId)
  if (!line) throw new Error(`no line ${lineId}`)
  return {
    lineId,
    level,
    disruptions,
    trains: { active: 3, delayed: 0, cancelled: 0, maxDelayMinutes: 0 },
    line: { badge: line.badge, color: line.color, name: { he: line.name.he, en: line.name.en }, stationIds: line.stationIds },
  }
}

const disruption = (
  id: string,
  level: ServiceStatusLevel,
  stationIds: string[],
  kind: Disruption["kind"] = "suspension",
): Disruption => ({
  id,
  kind,
  level,
  section: { fromStationId: stationIds[0], toStationId: stationIds[stationIds.length - 1], stationIds },
  trains: [],
})

/** Israel's wall clock for the tests, read the way the app reads naive times. */
const NOW = new Date("2026-09-13T13:00:00")

/** A naive wall-clock time some minutes from NOW. */
const inMinutes = (minutes: number): string => {
  const d = new Date(NOW.getTime() + minutes * 60_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

const departure = (trainNumber: number, minutes: number, delayMinutes = 0, cancelled = false): StationDeparture => ({
  trainNumber,
  time: inMinutes(minutes),
  delayMinutes,
  platform: 1,
  destinationStationId: "2800",
  cancelled,
  live: true,
})

const board = (stationId: string, trains: StationDeparture[], realtime = true): StationDepartures => ({
  schemaVersion: 1,
  stationId,
  generatedAt: "2026-09-13T10:00:00Z",
  realtime: { available: realtime },
  lines: [{ lineId: "1", directions: [{ towardsStationId: "2800", trains }] }],
})

/** The live delays on a line, somewhere along it: no section, just the trains. */
const lateTrains = (...delays: number[]): Disruption => ({
  id: "delays",
  kind: "delays",
  level: delays.some((d) => d >= 15) ? "severeDelays" : "minorDelays",
  section: null,
  source: "realtime",
  trains: delays.map(
    (delayMinutes, i): AffectedTrain => ({
      trainNumber: 100 + i,
      status: "delayed",
      originStationId: "2300",
      destinationStationId: "1300",
      departureTime: inMinutes(-60),
      arrivalTime: inMinutes(60),
      delayMinutes,
    }),
  ),
})

const snapshot = (lines: LineStatus[]): ServiceStatusSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-09-13T10:00:00Z",
  serviceDate: "2026-09-13",
  realtime: { available: true, updatedAt: "2026-09-13T10:00:00Z" },
  network: { level: "goodService", counts: {} },
  lines,
})

describe("station status", () => {
  test("the lines calling at a station follow the day's timetable", () => {
    // Savidor: on the Nahariya, Binyamina, Karmiel, Karmiel express and Herzliya lines on weekdays…
    const weekday = linesCallingAt("3700", "weekday").map((l) => l.id)
    expect(weekday).toContain("1")
    expect(weekday).toContain("2")
    expect(weekday).toContain("3X")
    // …but line 3X does not run at the weekend, and at night only lines 1 and 7 run.
    expect(linesCallingAt("3700", "weekend").map((l) => l.id)).not.toContain("3X")
    expect(
      linesCallingAt("3700", "night")
        .map((l) => l.id)
        .sort(),
    ).toEqual(["1", "7"])
    // Herzliya: line 1 runs through it on weekdays without calling.
    expect(linesCallingAt("3500", "weekday").map((l) => l.id)).not.toContain("1")
    expect(linesCallingAt("3500", "weekend").map((l) => l.id)).toContain("1")
    // HaShalom at night: both lines run through it.
    expect(linesCallingAt("4600", "night")).toEqual([])
  })

  test("with no snapshot nothing is known; a line missing from the snapshot has no trains", () => {
    expect(stationStatus(undefined, "3700", "night", null, NOW).level).toBe("unknown")
    const status = stationStatus(snapshot([lineStatus("1", "goodService")]), "3700", "night", null, NOW)
    expect(status.lines.map((l) => [l.line.id, l.level])).toEqual([
      ["1", "goodService"],
      ["7", "noService"],
    ])
    expect(status.level).toBe("goodService")
    expect(stationStatus(snapshot([]), "3700", "night", null, NOW).level).toBe("noService")
  })

  test("a disruption naming the station is the headline, ahead of the lines' own levels", () => {
    const works = disruption("announcement:5800-5900", "partSuspended", ["5800", "5900"])
    const late = disruption("delays", "minorDelays", ["3700", "4600", "4900"], "delays")
    const snap = snapshot([
      lineStatus("2", "partSuspended", [works]),
      lineStatus("6", "minorDelays", [late]),
      lineStatus("1", "goodService"),
    ])

    // Ashdod: the works name it.
    const ashdod = stationStatus(snap, "5800", "weekday", null, NOW)
    expect(ashdod.level).toBe("partSuspended")
    expect(ashdod.disruptions.map((d) => d.id)).toEqual(["announcement:5800-5900"])

    // Savidor: only the delays name it, though line 2 through it is part suspended elsewhere.
    const savidor = stationStatus(snap, "3700", "weekday", null, NOW)
    expect(savidor.level).toBe("minorDelays")
    expect(savidor.disruptions.map((d) => d.id)).toEqual(["delays"])

    // Binyamina: nothing names it, so the worst of its lines that is a disruption.
    const binyamina = stationStatus(snap, "2800", "weekday", null, NOW)
    expect(binyamina.disruptions).toEqual([])
    expect(binyamina.level).toBe("partSuspended")
  })

  test("the station's own next trains decide its delays, not a late train elsewhere on its lines", () => {
    // Hod HaSharon Sokolov (1500) on line 1, whose trains are late somewhere along it.
    const snap = snapshot([lineStatus("1", "minorDelays", [lateTrains(7)]), lineStatus("5", "goodService")])

    // One train here a few minutes late is not news; nothing late here at all even less.
    expect(stationStatus(snap, "1500", "weekday", board("1500", [departure(101, 10, 7), departure(103, 25)]), NOW).level).toBe(
      "goodService",
    )
    expect(stationStatus(snap, "1500", "weekday", board("1500", [departure(103, 25)]), NOW).level).toBe("goodService")

    // Two late trains in the next hour are delays; one badly late, or one cancelled, is enough alone.
    const twoLate = board("1500", [departure(101, 10, 7), departure(103, 25, 6)])
    expect(stationStatus(snap, "1500", "weekday", twoLate, NOW).level).toBe("minorDelays")
    expect(stationStatus(snap, "1500", "weekday", board("1500", [departure(101, 10, 18)]), NOW).level).toBe("severeDelays")
    expect(stationStatus(snap, "1500", "weekday", board("1500", [departure(101, 10, 0, true)]), NOW).level).toBe("severeDelays")

    // Late trains more than an hour off do not count yet.
    const later = board("1500", [departure(101, 70, 7), departure(103, 95, 8)])
    expect(stationStatus(snap, "1500", "weekday", later, NOW).level).toBe("goodService")
  })

  test("a station's own trains weigh in only once they are in, and the lines stand in when they cannot be had", () => {
    const snap = snapshot([lineStatus("1", "minorDelays", [lateTrains(7)])])
    // Loading: the headline waits rather than saying delays, then good.
    const loading = stationStatus(snap, "1500", "weekday", undefined, NOW)
    expect(loading.level).toBeUndefined()
    expect(stationStatusKind(loading)).toBeUndefined()
    expect(stationStatusKind(loading, true)).toBe("closed")
    // Nothing late on the lines: no reason to wait.
    expect(stationStatus(snapshot([lineStatus("1", "goodService")]), "1500", "weekday", undefined, NOW).level).toBe("goodService")
    // No board, or a board without the live feed: the lines' level, as before.
    expect(stationStatus(snap, "1500", "weekday", null, NOW).level).toBe("minorDelays")
    expect(stationStatus(snap, "1500", "weekday", board("1500", [departure(101, 10, 7)], false), NOW).level).toBe("minorDelays")
  })

  test("what names the station, or a stretch of its line elsewhere, still counts beside its own trains", () => {
    const works = disruption("announcement:5800-5900", "partSuspended", ["5800", "5900"])
    const onTime = board("2800", [departure(221, 10)])
    // Binyamina: line 2 is part suspended past Ashdod, and its trains elsewhere are late.
    const snap = snapshot([lineStatus("2", "partSuspended", [works, lateTrains(9)])])
    expect(stationStatus(snap, "2800", "weekday", onTime, NOW).level).toBe("partSuspended")
    // Ashdod: the works name it, whatever its board says.
    expect(stationStatus(snap, "5800", "weekday", undefined, NOW).level).toBe("partSuspended")
    // A cancellation on a stretch naming the station beats a minor delay on the board.
    const twoLate = board("2800", [departure(221, 10, 7), departure(223, 25, 6)])
    const named = snapshot([
      lineStatus("2", "partSuspended", [disruption("cancellations:2800-3100", "partSuspended", ["2800", "3100"])]),
    ])
    expect(stationStatus(named, "2800", "weekday", twoLate, NOW).level).toBe("partSuspended")
  })

  test("the next trains' level counts cancelled and late trains across lines and directions", () => {
    const departures: StationDepartures = {
      ...board("3700", []),
      lines: [
        { lineId: "1", directions: [{ towardsStationId: "2800", trains: [departure(101, 5, 0, true)] }] },
        { lineId: "2", directions: [{ towardsStationId: "5900", trains: [departure(202, 15, 0, true)] }] },
      ],
    }
    expect(nextTrainsLevel(departures, NOW)).toBe("partSuspended")
    expect(nextTrainsLevel(board("3700", [departure(101, 5, 4), departure(103, 15, 4)]), NOW)).toBeUndefined()
  })

  test("the same disruption on two lines is listed once, worst first", () => {
    const shared = disruption("announcement:3500-3700", "suspended", ["3500", "3600", "3700"])
    const minor = disruption("delays", "minorDelays", ["3600"], "delays")
    const snap = snapshot([lineStatus("1", "suspended", [shared, minor]), lineStatus("2", "suspended", [shared])])
    expect(stationDisruptions(snap, "3600").map((d) => d.id)).toEqual(["announcement:3500-3700", "delays"])
  })

  test("the card's colour: green, orange, red, planned works, and grey", () => {
    const good = stationStatus(snapshot([lineStatus("1", "goodService")]), "1500", "weekday", null, NOW)
    expect(stationStatusKind(good)).toBe("good")
    expect(stationStatusKind(good, true)).toBe("closed")
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "minorDelays")]), "1500", "weekday", null, NOW))).toBe(
      "delays",
    )
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "severeDelays")]), "1500", "weekday", null, NOW))).toBe(
      "delays",
    )
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended")]), "1500", "weekday", null, NOW))).toBe(
      "cancellations",
    )
    expect(stationStatusKind(stationStatus(snapshot([]), "1500", "night", null, NOW))).toBe("noService")
    expect(stationStatusKind(stationStatus(undefined, "1500", "night", null, NOW))).toBe("unknown")

    const works: Disruption = {
      ...disruption("announcement:1500-1600", "partSuspended", ["1500", "1600"]),
      source: "announcement",
    }
    const live = disruption("cancellations", "partSuspended", ["1500", "1600"], "cancellations")
    expect(
      stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended", [works])]), "1500", "weekday", null, NOW)),
    ).toBe("planned")
    // Live cancellations naming the station are not planned, even beside announced works elsewhere on the line.
    expect(
      stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended", [live, works])]), "1500", "weekday", null, NOW)),
    ).toBe("cancellations")
  })
})
