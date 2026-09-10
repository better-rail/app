import { describe, expect, test } from "bun:test"
import { RAIL_LINES } from "@/data/rail-lines"
import { MAP_NODES } from "@/data/rail-map-layout"
import {
  buildRailMapModel,
  linePathBetween,
  lineStationPoints,
  nearestLine,
  roundedPathD,
  stationLabelLines,
} from "./rail-map-model"

describe("rail map model", () => {
  const model = buildRailMapModel()

  test("routes every catalogue line through the track graph", () => {
    expect(model.lines.map((l) => l.lineId)).toEqual(RAIL_LINES.map((l) => l.id))
    for (const line of model.lines) {
      // Every calling point is on the path, in order.
      const indexes = line.line.stationIds.map((id) => line.vertexIndex.get(id))
      expect(indexes.every((i) => i !== undefined)).toBe(true)
      expect([...indexes]).toEqual([...indexes].sort((a, b) => (a as number) - (b as number)))
      expect(line.vertices.length).toBe(line.nodeIds.length)
      expect(line.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))).toBe(true)
      expect(line.d.startsWith("M")).toBe(true)
    }
  })

  test("every station node gets a marker and a label, junction waypoints get neither", () => {
    const stations = MAP_NODES.filter((n) => n.label)
    expect(model.markers.map((m) => m.stationId).sort()).toEqual(stations.map((n) => n.id).sort())
    expect(model.labels.map((l) => l.stationId).sort()).toEqual(stations.map((n) => n.id).sort())
    expect(model.markers.some((m) => m.stationId.startsWith("J_"))).toBe(false)
  })

  test("interchanges are capsules, single-line stops are rings", () => {
    const savidor = model.markers.find((m) => m.stationId === "3700")
    const dimona = model.markers.find((m) => m.stationId === "7500")
    expect(savidor?.kind).toBe("capsule")
    expect(savidor?.lineIds.length).toBeGreaterThan(5)
    expect(dimona?.kind).toBe("single")
    expect(dimona?.lineIds).toEqual(["8"])
  })

  test("labels sit clear of the marker on the requested side", () => {
    const herzliya = model.markers.find((m) => m.stationId === "3500")
    const label = model.labels.find((l) => l.stationId === "3500")
    expect(label?.side).toBe("left")
    expect(label && herzliya && label.anchor.x < herzliya.center.x - herzliya.halfWidth).toBe(true)
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
    const dimona = model.nodeById.get("7500")
    if (!dimona) throw new Error("Dimona missing")
    expect(nearestLine(model, { x: dimona.x - 3, y: dimona.y - 1.5 }, 3)?.lineId).toBe("8")
    expect(nearestLine(model, { x: 0, y: 40 }, 3)).toBeUndefined()
  })

  test("station names break into two lines the way the map sets them", () => {
    expect(stationLabelLines("Tel Aviv - Savidor Center")).toEqual(["Tel Aviv", "Savidor Center"])
    expect(stationLabelLines("Shomron – Tayyiba")).toEqual(["Shomron", "Tayyiba"])
    expect(stationLabelLines("Ben Gurion Airport")).toEqual(["Ben Gurion", "Airport"])
    expect(stationLabelLines("Petah Tikva - Kiryat Arye", 9)).toEqual(["Petah", "Tikva", "Kiryat", "Arye"])
    expect(stationLabelLines("Haifa - Hof HaKarmel", 14, true)).toEqual(["Hof HaKarmel"])
    expect(stationLabelLines("Herzliya")).toEqual(["Herzliya"])
    expect(stationLabelLines("תל אביב - סבידור מרכז")).toEqual(["תל אביב", "סבידור מרכז"])
  })

  test("rounded paths keep the end points and round every corner", () => {
    const d = roundedPathD([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
    expect(d).toBe("M0 0 L5 0 Q10 0 10 5 L10 10")
  })
})
