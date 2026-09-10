import { describe, expect, test } from "bun:test"
import { RAIL_LINES } from "@/data/rail-lines"
import { STATION_LABELS } from "@/data/rail-map-layout"
import { buildRailMapModel, linePathBetween, lineStationPoints, mapStationName, nearestLine, polylineD } from "./rail-map-model"

describe("rail map model", () => {
  const model = buildRailMapModel()

  test("draws every catalogue line along its traced polyline with the calling points in corridor order", () => {
    expect(model.lines.map((l) => l.lineId)).toEqual(RAIL_LINES.map((l) => l.id))
    for (const line of model.lines) {
      expect(line.stations.map((s) => s.id)).toEqual(line.line.stationIds)
      const indexes = line.stations.map((s) => s.index)
      expect([...indexes]).toEqual([...indexes].sort((a, b) => a - b))
      expect(indexes.every((i) => i >= 0 && i < line.vertices.length)).toBe(true)
      expect(line.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))).toBe(true)
      expect(line.vertices.every((v) => v.x >= 0 && v.x <= model.bounds.width && v.y >= 0 && v.y <= model.bounds.height)).toBe(
        true,
      )
      expect(line.d.startsWith("M")).toBe(true)
    }
  })

  test("every station on a line has a name on the map, and every name belongs to a station on a line", () => {
    const onLines = new Set(RAIL_LINES.flatMap((l) => l.stationIds))
    expect([...onLines].sort()).toEqual(Object.keys(STATION_LABELS).sort())
    expect(model.labels.map((l) => l.stationId).sort()).toEqual([...onLines].sort())
  })

  test("a dot marks every lane that calls at a station and a tick where a line runs through", () => {
    const savidor = model.markers.filter((m) => m.stationId === "3700")
    expect(savidor.length).toBeGreaterThanOrEqual(6)
    expect(savidor.every((m) => m.kind === "stop")).toBe(true)
    const dimona = model.markers.filter((m) => m.stationId === "7500")
    expect(dimona.map((m) => [m.lineId, m.kind])).toEqual([["8", "stop"]])
    // Line 3 passes Kiryat Hayim without calling, the Karmiel and Nahariya locals stop there.
    const kiryatHayim = Object.fromEntries(model.markers.filter((m) => m.stationId === "700").map((m) => [m.lineId, m.kind]))
    expect(kiryatHayim).toEqual({ "1": "stop", "3": "pass", "4": "stop" })
  })

  test("labels for the big cities' stations drop the city prefix, the rest keep their names", () => {
    expect(model.labels.find((l) => l.stationId === "4600")?.stationNameOnly).toBe(true)
    expect(model.labels.find((l) => l.stationId === "3500")?.stationNameOnly).toBe(false)
    expect(model.labels.find((l) => l.stationId === "3500")?.side).toBe("left")
    expect(model.labels.find((l) => l.stationId === "1840")?.side).toBe("right")
  })

  test("a stretch of a line can be extracted between two of its stations", () => {
    const line2 = model.lines.find((l) => l.lineId === "2")
    if (!line2) throw new Error("line 2 missing")
    expect(linePathBetween(line2, "5800", "5900")).toBeDefined()
    expect(linePathBetween(line2, "5900", "5800")).toBe(linePathBetween(line2, "5800", "5900"))
    expect(linePathBetween(line2, "5800", "680")).toBeUndefined()
    expect(lineStationPoints(line2, ["5800", "680", "5900"])).toHaveLength(2)
  })

  test("tapping near a line finds it, tapping empty ground finds nothing", () => {
    const dimona = model.markers.find((m) => m.stationId === "7500")
    if (!dimona) throw new Error("Dimona missing")
    expect(nearestLine(model, { x: dimona.point.x - 1, y: dimona.point.y - 1 }, 3)?.lineId).toBe("8")
    expect(nearestLine(model, { x: 5, y: 40 }, 3)).toBeUndefined()
  })

  test("city frames, terminal badges and the aeroplane come from the traced layout", () => {
    expect(model.cities.map((c) => c.id)).toEqual(["haifa", "telaviv", "jerusalem", "beersheva"])
    expect(model.badges.some((b) => b.lineId === "2")).toBe(true)
    expect(model.badges.every((b) => b.line.id === b.lineId)).toBe(true)
    expect(model.airport.height).toBeGreaterThan(0)
  })

  test("map names drop parentheticals and, inside a city frame, the city prefix", () => {
    expect(mapStationName("Tel Aviv - Savidor Center", true)).toBe("Savidor Center")
    expect(mapStationName("תל אביב - סבידור מרכז", true)).toBe("סבידור מרכז")
    expect(mapStationName("מרכזית המפרץ (לב המפרץ)", false)).toBe("מרכזית המפרץ")
    expect(mapStationName("Herzliya", true)).toBe("Herzliya")
  })

  test("polylines become straight-segment path data", () => {
    expect(
      polylineD([
        { x: 0, y: 0 },
        { x: 10.123, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe("M0 0 L10.12 0 L10 10")
  })
})
