import { describe, expect, it } from "bun:test"
import { alternativeChangeStations, easyPlatformChanges, trainStartStation } from "./alternative-change-stations"
import type { Train } from "@/services/api"

const train = (
  originStationId: number,
  destinationStationId: number,
  run: number[],
  platforms: number[] = [],
  times: string[] = [],
) =>
  ({
    originStationId,
    destinationStationId,
    routeStations: run.map((stationId, i) => ({
      stationId,
      arrivalTime: times[i] ?? "",
      crowded: 0,
      platform: platforms[i] ?? 0,
    })),
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

  it("skips stations the second train leaves before the first gets there", () => {
    // Hadera -> Rishon: train 339 starts at Herzliya (3500) and loops back to Tel Aviv before 423 reaches Herzliya.
    const first = train(3100, 3700, [3100, 3500, 3600, 3700], [1, 4, 2, 3], ["18:08", "18:27", "18:35", "18:42"])
    const second = train(3700, 9800, [3500, 3600, 3700, 9800], [1, 4, 6, 1], ["18:03", "18:47", "18:54", "19:19"])
    expect(alternativeChangeStations(first, second)).toEqual(["3600"])
  })

  it("skips stations where the wait is too short to change trains", () => {
    const first = train(1, 4, [1, 2, 3, 4], [1, 1, 1, 1], ["10:00", "10:10", "10:20", "10:30"])
    const second = train(4, 6, [2, 3, 4, 6], [2, 1, 1, 1], ["10:13", "10:24", "10:40", "10:50"])
    // Station 2: 3 minutes across platforms. Station 3: 4 minutes on the same platform.
    expect(alternativeChangeStations(first, second)).toEqual(["3"])
  })

  it("gives the shorter wait only to known platforms, and across an island only at Savidor", () => {
    const times: [string[], string[]] = [
      ["10:00", "10:10", "10:20", "10:30", "10:40"],
      ["10:14", "10:24", "10:34", "10:50", "11:00"],
    ]
    // 4 minutes at each: unknown platforms at 2, University's island at 3600, Savidor's island at 3700.
    const first = train(1, 4, [1, 2, 3600, 3700, 4], [1, 0, 1, 3, 1], times[0])
    const second = train(4, 6, [2, 3600, 3700, 4, 6], [0, 2, 4, 1, 1], times[1])
    expect(alternativeChangeStations(first, second)).toEqual(["3700"])
  })

  it("handles a change that crosses midnight", () => {
    const first = train(1, 4, [1, 2, 4], [], ["23:40", "23:55", "00:10"])
    const second = train(4, 6, [2, 4, 6], [], ["00:05", "00:20", "00:40"])
    expect(alternativeChangeStations(first, second)).toEqual(["2"])
  })
})

describe("trainStartStation", () => {
  it("returns the first stop of the train's run", () => {
    expect(trainStartStation(train(4, 6, [9, 3, 4, 5, 6]))).toBe("9")
  })

  it("skips stops cancelled in realtime", () => {
    const t = train(4, 6, [9, 3, 4, 5, 6])
    t.routeStations[0].cancelled = true
    expect(trainStartStation(t)).toBe("3")
  })

  it("returns undefined for a cancelled train", () => {
    expect(trainStartStation({ ...train(4, 6, [9, 3, 4]), isCancelled: true })).toBeUndefined()
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
