import { describe, expect, mock, test } from "bun:test"
import type { RouteItem, Train } from "@/services/api"
import type { RouteSearchResult } from "@/models/train-routes/search-routes"
import {
  getScrollTarget,
  organizeRouteResults,
  patchRoutes,
  publishFreshRoutes,
  subscribeToFreshRoutes,
} from "./route-list-query"

const route = (departureTime: number, trainNumbers: number[], delay = 0) =>
  ({
    departureTime,
    delay,
    isCancelled: false,
    isMuchShorter: true,
    trains: trainNumbers.map((trainNumber) => ({ trainNumber, delay, platform: 1 }) as unknown as Train),
  }) as RouteItem

describe("patchRoutes", () => {
  test("updates matching routes across date headers, keeping list-relative flags", () => {
    const list = ["Tue Oct 07 2026", route(100, [160], 4), "Wed Oct 08 2026", route(200, [110], 4), route(300, [112], 4)]

    const [today, first, tomorrow, second, untouched] = patchRoutes(list, [
      { ...route(100, [160], 2), isMuchShorter: false },
      route(200, [110], 6),
    ]) as [string, RouteItem, string, RouteItem, RouteItem]

    expect([today, tomorrow]).toEqual(["Tue Oct 07 2026", "Wed Oct 08 2026"])
    expect(first.delay).toBe(2)
    expect(first.trains[0].delay).toBe(2)
    expect(first.isMuchShorter).toBe(true)
    expect(second.delay).toBe(6)
    expect(untouched.delay).toBe(4)
  })

  test("leaves routes with different trains or departure alone", () => {
    const list = [route(100, [160, 520], 4), route(100, [161], 4)]

    const patched = patchRoutes(list, [route(100, [160, 530], 2), route(200, [161], 2)])

    expect(patched.map((item) => item.delay)).toEqual([4, 4])
  })
})

describe("publishFreshRoutes", () => {
  test("reaches only subscribers of the same station pair", () => {
    const onRoutes = mock()
    const onOtherRoutes = mock()
    const unsubscribe = subscribeToFreshRoutes({ originId: "3700", destinationId: "2300", onRoutes })
    const unsubscribeOther = subscribeToFreshRoutes({ originId: "4600", destinationId: "3700", onRoutes: onOtherRoutes })

    publishFreshRoutes("3700", "2300", [route(100, [160], 2)])
    publishFreshRoutes("3700", "2300", [])
    unsubscribe()
    unsubscribeOther()
    publishFreshRoutes("3700", "2300", [route(100, [160], 2)])

    expect(onRoutes).toHaveBeenCalledTimes(1)
    expect(onOtherRoutes).not.toHaveBeenCalled()
  })
})

describe("getScrollTarget", () => {
  const departingAt = (date: Date) => ({ trains: [{ departureTime: date.getTime() }] }) as RouteItem
  const today = new Date(2026, 9, 16, 10)
  const tomorrow = new Date(2026, 9, 17, 10)
  const list = [today.toDateString(), departingAt(today), tomorrow.toDateString(), departingAt(tomorrow)]

  test("leaves room for a later day's pinned date header", () => {
    expect(getScrollTarget(list, 3, 40, 8, today.toDateString())).toEqual({ index: 3, viewOffset: 40 })
  })

  test("leaves a small gap above today's routes, whose header isn't pinned", () => {
    expect(getScrollTarget(list, 1, 40, 8, today.toDateString())).toEqual({ index: 1, viewOffset: 8 })
  })

  test("needs no offset when targeting a header", () => {
    expect(getScrollTarget(list, 2, 40, 8, today.toDateString())).toEqual({ index: 2 })
  })
})

describe("organizeRouteResults", () => {
  const MINUTE = 60_000
  const trip = (departureTime: number, minutes: number, trainNumber: number) =>
    ({
      departureTime,
      arrivalTime: departureTime + minutes * MINUTE,
      isExchange: false,
      isMuchLonger: false,
      isMuchShorter: false,
      trains: [{ trainNumber, departureTime } as unknown as Train],
    }) as RouteItem
  const result = (requestedTime: number, routes: RouteItem[]) =>
    ({ routes, requestedTime, resolvedTime: requestedTime, resultType: "normal" }) as RouteSearchResult

  test("judges after-midnight trains against the evening before, whichever day's copy is kept", () => {
    const evening = new Date(2026, 9, 21, 23, 40).getTime()
    const fast = trip(evening, 15, 1)
    // The next day's search can't see the 23:40, so it doesn't flag its own copy of the 00:30
    const slow = trip(evening + 50 * MINUTE, 52, 2)

    const data = organizeRouteResults([result(evening, [fast, slow]), result(evening + 60 * MINUTE, [slow])])

    const kept = data.find((item): item is RouteItem => typeof item !== "string" && item.trains[0].trainNumber === 2)
    expect(kept?.isMuchLonger).toBe(true)
  })
})
