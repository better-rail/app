import { describe, expect, test } from "bun:test"
import { RAIL_LINE_IDS, getRailLine } from "@/data/rail-lines"
import { type DisruptionKind, type ServiceStatusLevel, compareServiceStatusLevels, isDisruptedLevel } from "@/services/api"
import { simulatedServiceStatus } from "./simulated-service-status"

describe("simulated service status", () => {
  const snapshot = simulatedServiceStatus(new Date("2026-09-11T18:30:00"))

  test("has every line of the catalogue, every level and every kind of disruption", () => {
    expect([...snapshot.lines.map((l) => l.lineId)].sort()).toEqual([...RAIL_LINE_IDS].sort())
    const levels = new Set(snapshot.lines.map((l) => l.level))
    const expectedLevels: ServiceStatusLevel[] = [
      "goodService",
      "minorDelays",
      "severeDelays",
      "partSuspended",
      "suspended",
      "noService",
    ]
    for (const level of expectedLevels) expect(levels).toContain(level)
    const kinds = new Set(snapshot.lines.flatMap((l) => l.disruptions.map((d) => d.kind)))
    const expectedKinds: DisruptionKind[] = [
      "delays",
      "cancellations",
      "skippedStops",
      "curtailment",
      "suspension",
      "extraTrains",
    ]
    for (const kind of expectedKinds) expect(kinds).toContain(kind)
  })

  test("every section lies along its line, in the line's order, so the map can draw it", () => {
    for (const line of snapshot.lines) {
      const stationIds = getRailLine(line.lineId)?.stationIds ?? []
      for (const { kind, section } of line.disruptions) {
        if (!section) continue
        const from = stationIds.indexOf(section.fromStationId)
        const to = stationIds.indexOf(section.toStationId)
        expect(from).toBeGreaterThanOrEqual(0)
        expect(to).toBeGreaterThanOrEqual(0)
        const stretch = stationIds.slice(Math.min(from, to), Math.max(from, to) + 1)
        // Skipped stops need not be adjacent; a stretch with no service is whole.
        if (kind === "skippedStops") expect(stretch.filter((id) => section.stationIds.includes(id))).toEqual(section.stationIds)
        else expect(section.stationIds).toEqual(stretch)
      }
    }
  })

  test("an announced disruption carries what the card shows: why, until when, how else to travel, where to read more", () => {
    const announced = snapshot.lines.flatMap((l) => l.disruptions).filter((d) => d.source === "announcement")
    expect(announced.length).toBeGreaterThanOrEqual(2)
    const works = announced.find((d) => d.kind === "suspension")
    expect(works?.reason?.en).toContain("works")
    expect(works?.alternatives?.map((a) => a.mode)).toEqual(["shuttle", "bus"])
    expect(works?.link).toMatch(/^https:\/\/www\.rail\.co\.il/)
    expect(works?.validity).toEqual({ from: "2026-09-11T06:30:00", to: "2026-09-13T18:30:00" })
    expect(snapshot.announcements?.updatedAt).toBe(snapshot.generatedAt)
  })

  test("a line's level is its worst disruption's, worst first, and the counts follow the trains", () => {
    for (const line of snapshot.lines) {
      if (!isDisruptedLevel(line.level)) {
        expect(line.disruptions).toEqual([])
        continue
      }
      expect(line.disruptions[0].level).toBe(line.level)
      for (let i = 1; i < line.disruptions.length; i++) {
        expect(compareServiceStatusLevels(line.disruptions[i - 1].level, line.disruptions[i].level)).toBeGreaterThanOrEqual(0)
      }
      const trains = line.disruptions.flatMap((d) => d.trains)
      expect(line.trains.delayed).toBe(trains.filter((t) => t.status === "delayed").length)
      expect(line.trains.cancelled).toBe(trains.filter((t) => t.status === "cancelled").length)
      expect(line.trains.active).toBeGreaterThanOrEqual(trains.length)
      // Extra trains never make a line's level; they sit last, as good service.
      for (const d of line.disruptions) if (d.kind === "extraTrains") expect(d.level).toBe("goodService")
    }
    expect(snapshot.network.level).toBe("suspended")
    expect(Object.values(snapshot.network.counts).reduce((a, b) => a + b, 0)).toBe(snapshot.lines.length)
  })

  test("times are naive wall-clock strings around now, and the feed reads as live", () => {
    const train = snapshot.lines.find((l) => l.lineId === "1")?.disruptions[1].trains[0]
    expect(train?.departureTime).toBe("2026-09-11T17:35:00")
    expect(train?.arrivalTime).toBe("2026-09-11T20:05:00")
    expect(snapshot.serviceDate).toBe("2026-09-11")
    expect(snapshot.realtime.available).toBe(true)
  })
})
