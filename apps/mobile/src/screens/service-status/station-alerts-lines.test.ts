import { describe, expect, test } from "bun:test"
import { alertLinesFor, toggleChoice } from "./station-alerts-lines"

describe("the lines a station's alerts can be limited to", () => {
  test("every line calling at the station on any timetable, in catalogue order", () => {
    const ids = alertLinesFor("3700").map((l) => l.id)
    expect(ids).toContain("1")
    expect(ids).toContain("2")
    expect(alertLinesFor("1234")).toEqual([])
  })

  test("tapping a line narrows from every line, grows, and falls back to every line", () => {
    const all = ["1", "2", "7"]
    expect(toggleChoice(null, "2", all)).toEqual(["2"])
    expect(toggleChoice(["2"], "7", all)).toEqual(["2", "7"])
    expect(toggleChoice(["2", "7"], "1", all)).toBeNull()
    expect(toggleChoice(["2"], "2", all)).toBeNull()
    expect(toggleChoice(["7", "2"], "2", all)).toEqual(["7"])
  })
})
