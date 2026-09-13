import { describe, expect, test } from "bun:test"
import { getRailLine, type RailLineId } from "@/data/rail-lines"
import type { Disruption, LineStatus, ServiceStatusLevel, ServiceStatusSnapshot } from "@/services/api"
import { linesCallingAt, stationDisruptions, stationStatus, stationStatusKind } from "./station-status"

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
    expect(stationStatus(undefined, "3700", "night").level).toBe("unknown")
    const status = stationStatus(snapshot([lineStatus("1", "goodService")]), "3700", "night")
    expect(status.lines.map((l) => [l.line.id, l.level])).toEqual([
      ["1", "goodService"],
      ["7", "noService"],
    ])
    expect(status.level).toBe("goodService")
    expect(stationStatus(snapshot([]), "3700", "night").level).toBe("noService")
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
    const ashdod = stationStatus(snap, "5800", "weekday")
    expect(ashdod.level).toBe("partSuspended")
    expect(ashdod.disruptions.map((d) => d.id)).toEqual(["announcement:5800-5900"])

    // Savidor: only the delays name it, though line 2 through it is part suspended elsewhere.
    const savidor = stationStatus(snap, "3700", "weekday")
    expect(savidor.level).toBe("minorDelays")
    expect(savidor.disruptions.map((d) => d.id)).toEqual(["delays"])

    // Binyamina: nothing names it, so the worst of its lines that is a disruption.
    const binyamina = stationStatus(snap, "2800", "weekday")
    expect(binyamina.disruptions).toEqual([])
    expect(binyamina.level).toBe("partSuspended")
  })

  test("the same disruption on two lines is listed once, worst first", () => {
    const shared = disruption("announcement:3500-3700", "suspended", ["3500", "3600", "3700"])
    const minor = disruption("delays", "minorDelays", ["3600"], "delays")
    const snap = snapshot([lineStatus("1", "suspended", [shared, minor]), lineStatus("2", "suspended", [shared])])
    expect(stationDisruptions(snap, "3600").map((d) => d.id)).toEqual(["announcement:3500-3700", "delays"])
  })

  test("the card's colour: green, orange, red, planned works, and grey", () => {
    const good = stationStatus(snapshot([lineStatus("1", "goodService")]), "1500", "weekday")
    expect(stationStatusKind(good)).toBe("good")
    expect(stationStatusKind(good, true)).toBe("closed")
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "minorDelays")]), "1500", "weekday"))).toBe("delays")
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "severeDelays")]), "1500", "weekday"))).toBe("delays")
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended")]), "1500", "weekday"))).toBe(
      "cancellations",
    )
    expect(stationStatusKind(stationStatus(snapshot([]), "1500", "night"))).toBe("noService")
    expect(stationStatusKind(stationStatus(undefined, "1500", "night"))).toBe("unknown")

    const works: Disruption = {
      ...disruption("announcement:1500-1600", "partSuspended", ["1500", "1600"]),
      source: "announcement",
    }
    const live = disruption("cancellations", "partSuspended", ["1500", "1600"], "cancellations")
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended", [works])]), "1500", "weekday"))).toBe(
      "planned",
    )
    // Live cancellations naming the station are not planned, even beside announced works elsewhere on the line.
    expect(stationStatusKind(stationStatus(snapshot([lineStatus("1", "partSuspended", [live, works])]), "1500", "weekday"))).toBe(
      "cancellations",
    )
  })
})
