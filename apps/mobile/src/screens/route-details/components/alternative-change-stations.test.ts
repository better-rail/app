import { describe, expect, it } from "bun:test"
import { alternativeChangeStations, easyPlatformChanges, trainStartStation } from "./alternative-change-stations"
import type { Train } from "@/services/api"

const train = (originStationId: number, destinationStationId: number, run: number[], platforms: number[] = []) =>
  ({
    originStationId,
    destinationStationId,
    routeStations: run.map((stationId, i) => ({ stationId, arrivalTime: "", crowded: 0, platform: platforms[i] ?? 0 })),
  }) as unknown as Train

describe("alternativeChangeStations", () => {
  it("lists stations both trains call at, excluding the current change", () => {
    // Board at 1, change at 4; the second train runs 9 -> 3 -> 4 -> 5 -> 6 and the rider gets off at 6.
    const first = train(1, 4, [0, 1, 2, 3, 4, 5])
    const second = train(4, 6, [9, 3, 4, 5, 6, 7])
    expect(alternativeChangeStations(first, second)).toEqual(["3", "5"])
  })

  it("returns nothing when the runs share only the change station", () => {
    expect(alternativeChangeStations(train(1, 4, [1, 2, 4]), train(4, 6, [4, 6]))).toEqual([])
  })
})

describe("trainStartStation", () => {
  it("returns the first stop of the train's run", () => {
    expect(trainStartStation(train(4, 6, [9, 3, 4, 5, 6]))).toBe("9")
  })

  it("returns undefined without a run", () => {
    expect(trainStartStation(train(4, 6, []))).toBeUndefined()
  })
})

describe("easyPlatformChanges", () => {
  it("marks stations where both trains use the same platform", () => {
    const first = train(1, 4, [1, 2, 3, 4], [1, 2, 3, 1])
    const second = train(4, 6, [2, 3, 4, 6], [2, 1, 1, 1])
    expect(easyPlatformChanges(first, second, ["2", "3"])).toEqual({ "2": "same" })
  })

  it("marks platforms sharing an island", () => {
    // Savidor (3700): platforms 3 and 4 share an island, 2 and 3 don't
    const first = train(1, 4, [1, 3700, 4], [1, 3, 1])
    const across = train(4, 6, [3700, 4, 6], [4, 1, 1])
    const apart = train(4, 6, [3700, 4, 6], [2, 1, 1])
    expect(easyPlatformChanges(first, across, ["3700"])).toEqual({ "3700": "across" })
    expect(easyPlatformChanges(first, apart, ["3700"])).toEqual({})
  })

  it("ignores unknown platforms", () => {
    const first = train(1, 4, [1, 2, 4], [1, 0, 1])
    const second = train(4, 6, [2, 4, 6], [0, 1, 1])
    expect(easyPlatformChanges(first, second, ["2"])).toEqual({})
  })
})
