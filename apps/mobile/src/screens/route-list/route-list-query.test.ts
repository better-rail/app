import { describe, expect, test } from "bun:test"
// The core entry skips react-dom batching, which crashes under bun
import { QueryClient } from "react-query/core"
import type { RouteItem, Train } from "@/services/api"
import { patchRouteList, routeListDayQueryKey, routeListQueryKey } from "./route-list-query"

const route = (departureTime: number, trainNumbers: number[], delay = 0) =>
  ({
    departureTime,
    delay,
    isCancelled: false,
    isMuchShorter: true,
    trains: trainNumbers.map((trainNumber) => ({ trainNumber, delay, platform: 1 }) as unknown as Train),
  }) as RouteItem

describe("patchRouteList", () => {
  test("updates every matching route in every cached list for the pair", () => {
    const queryClient = new QueryClient()
    const listKey = (time: number) => routeListDayQueryKey("3700", "2300", time, false)
    queryClient.setQueryData(listKey(1), [route(100, [160], 4), route(200, [110], 4)])
    queryClient.setQueryData(listKey(2), [route(100, [160], 4)])
    queryClient.setQueryData([...routeListQueryKey("4600", "3700"), "time", 1], [route(100, [160], 4)])

    patchRouteList(queryClient, "3700", "2300", [{ ...route(100, [160], 2), isMuchShorter: false }, route(200, [110], 6)])

    const [patched, second] = queryClient.getQueryData<RouteItem[]>(listKey(1))!
    expect(patched.delay).toBe(2)
    expect(patched.trains[0].delay).toBe(2)
    // List-relative flags stay as the list computed them
    expect(patched.isMuchShorter).toBe(true)
    expect(second.delay).toBe(6)
    expect(queryClient.getQueryData<RouteItem[]>(listKey(2))![0].delay).toBe(2)
    expect(queryClient.getQueryData<RouteItem[]>([...routeListQueryKey("4600", "3700"), "time", 1])![0].delay).toBe(4)
  })

  test("leaves routes with different trains alone", () => {
    const queryClient = new QueryClient()
    const key = [...routeListQueryKey("3700", "2300"), "time", 1]
    queryClient.setQueryData(key, [route(100, [160, 520], 4)])

    patchRouteList(queryClient, "3700", "2300", [route(100, [160, 530], 2)])

    expect(queryClient.getQueryData<RouteItem[]>(key)![0].delay).toBe(4)
  })

  test("leaves a list that never loaded alone", () => {
    const queryClient = new QueryClient()
    const key = routeListDayQueryKey("3700", "2300", 1, false)
    // An errored or disabled list query has no data
    queryClient.getQueryCache().build(queryClient, { queryKey: key })

    patchRouteList(queryClient, "3700", "2300", [route(100, [160], 2)])

    expect(queryClient.getQueryState(key)?.status).toBe("idle")
  })
})
