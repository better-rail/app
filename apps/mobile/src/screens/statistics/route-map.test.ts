import { describe, expect, test } from "bun:test"
import { pathLength, projectStations } from "./route-map"

describe("projectStations", () => {
  test("keeps the route inside the padded box, north at the top", () => {
    // Haifa Hof HaCarmel, then Tel Aviv Savidor
    const [haifa, telAviv] = projectStations(["2300", "3700"], 300, 200, 20)
    for (const point of [haifa, telAviv]) {
      expect(point.x).toBeGreaterThanOrEqual(20)
      expect(point.x).toBeLessThanOrEqual(280)
      expect(point.y).toBeGreaterThanOrEqual(20)
      expect(point.y).toBeLessThanOrEqual(180)
    }
    expect(haifa.y).toBeLessThan(telAviv.y)
  })

  test("centers a single station and skips unknown ids", () => {
    expect(projectStations(["2300", "nope"], 300, 200, 20)).toEqual([{ x: 150, y: 100 }])
  })
})

describe("pathLength", () => {
  test("sums the segments", () => {
    expect(
      pathLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 10 },
      ]),
    ).toBe(11)
  })
})
