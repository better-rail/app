import { describe, expect, mock, test } from "bun:test"
import type { RouteItem, Train } from "@/services/api"
import { patchRoutes, publishFreshRoutes, subscribeToFreshRoutes } from "./route-list-query"

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
