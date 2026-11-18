import { describe, expect, it } from "bun:test"
import { connectionStatus } from "./connection-status"
import type { Train } from "@/services/api"

const DEPARTURE = new Date("2026-11-17T16:18:00").getTime()
const BEFORE_DEPARTURE = DEPARTURE - 60_000
const AFTER_DEPARTURE = DEPARTURE + 2 * 60_000

// Change at station 4. The first train runs 1 -> 2 -> 3 -> 4; the connecting train runs 9 -> 4 -> 5 -> 6.
const train = (originStationId: number, run: number[], position?: { currentLastStation?: number; nextStation?: number }) =>
  ({
    originStationId,
    departureTime: DEPARTURE,
    routeStations: run.map((stationId) => ({ stationId, arrivalTime: "", crowded: 0, platform: 0 })),
    trainPosition: { calcDiffMinutes: 0, ...position },
  }) as unknown as Train

const firstAt = (currentLastStation: number, nextStation = 0) => train(1, [1, 2, 3, 4], { currentLastStation, nextStation })
const secondAt = (currentLastStation: number, nextStation = 0) => train(4, [9, 4, 5, 6], { currentLastStation, nextStation })

describe("connectionStatus", () => {
  it("says the connecting train is still there once its departure time passed", () => {
    expect(connectionStatus(firstAt(3, 4), secondAt(4), AFTER_DEPARTURE)).toBe("stillAtStation")
  })

  it("says nothing while the connecting train stands there before its departure time", () => {
    expect(connectionStatus(firstAt(2, 3), secondAt(4), BEFORE_DEPARTURE)).toBe("unknown")
  })

  it("says the connecting train left when it's heading to the next station", () => {
    expect(connectionStatus(firstAt(3, 4), secondAt(4, 5), AFTER_DEPARTURE)).toBe("left")
  })

  it("says the connecting train left when it's already past the change station", () => {
    expect(connectionStatus(firstAt(3, 4), secondAt(5), AFTER_DEPARTURE)).toBe("left")
  })

  it("says nothing while the connecting train hasn't reached the change station", () => {
    expect(connectionStatus(firstAt(3, 4), secondAt(9, 4), AFTER_DEPARTURE)).toBe("unknown")
  })

  it("says nothing once the first train is at the change station", () => {
    // The rider may well be on the connecting train by the time it leaves
    expect(connectionStatus(firstAt(4), secondAt(4, 5), AFTER_DEPARTURE)).toBe("unknown")
    expect(connectionStatus(firstAt(4), secondAt(4), AFTER_DEPARTURE)).toBe("unknown")
  })

  it("says nothing without live positions", () => {
    const noPosition = (t: Train) => ({ ...t, trainPosition: { calcDiffMinutes: 0 } }) as Train
    expect(connectionStatus(noPosition(firstAt(3)), secondAt(4), AFTER_DEPARTURE)).toBe("unknown")
    expect(connectionStatus(firstAt(3, 4), noPosition(secondAt(4)), AFTER_DEPARTURE)).toBe("unknown")
  })

  it("says nothing when a position isn't on the train's run", () => {
    expect(connectionStatus(firstAt(3, 4), secondAt(42), AFTER_DEPARTURE)).toBe("unknown")
    expect(connectionStatus(firstAt(42), secondAt(4, 5), AFTER_DEPARTURE)).toBe("unknown")
  })
})
