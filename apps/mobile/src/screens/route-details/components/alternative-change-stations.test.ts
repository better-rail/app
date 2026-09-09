import { describe, expect, it } from "bun:test"
import { alternativeChangeStations } from "./alternative-change-stations"
import type { Train } from "@/services/api"

const train = (originStationId: number, destinationStationId: number, run: number[]) =>
  ({
    originStationId,
    destinationStationId,
    routeStations: run.map((stationId) => ({ stationId, arrivalTime: "", crowded: 0 })),
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
