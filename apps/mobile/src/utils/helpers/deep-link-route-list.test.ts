import { describe, expect, it } from "bun:test"
import { getDeepLinkDismissals } from "./deep-link-route-list"

type Route = { name: string; params?: object; state?: { key?: string; index?: number; routes: Route[] } }

// Mirrors expo-router's state: the app's layouts sit under its own `__root` navigator.
const rootState = (
  mainRoutes: Route[],
  { index = mainRoutes.length - 1, modals = [] }: { index?: number; modals?: Route[] } = {},
) => ({
  key: "navigator:root",
  index: 0,
  routes: [
    {
      name: "__root",
      state: {
        key: "navigator:0",
        index: modals.length,
        routes: [{ name: "(main)", state: { key: "main-stack", index, routes: mainRoutes } }, ...modals],
      },
    },
  ],
})

const planner = { name: "index" }
const searchedRouteList = { name: "route-list", params: { originId: "1600", destinationId: "3100" } }
const deepLinkedRouteList = { name: "route-list", params: { originId: "1600", destinationId: "3100", deepLink: "true" } }
const routeDetails = { name: "route-details" }
const activeRide = { name: "active-ride", state: { routes: [{ name: "index" }] } }

describe("getDeepLinkDismissals", () => {
  it("dismisses nothing before the first deep link", () => {
    expect(getDeepLinkDismissals(rootState([planner, searchedRouteList, routeDetails]))).toEqual({
      parentKey: "navigator:0",
      modals: 0,
      deepLinkedScreens: 0,
    })
  })

  it("dismisses the previous deep-linked route list", () => {
    expect(getDeepLinkDismissals(rootState([planner, deepLinkedRouteList]))?.deepLinkedScreens).toBe(1)
  })

  it("dismisses the screens opened on top of the previous deep link, but not the ones below it", () => {
    expect(
      getDeepLinkDismissals(rootState([planner, searchedRouteList, deepLinkedRouteList, routeDetails]))?.deepLinkedScreens,
    ).toBe(2)
  })

  it("ignores preloaded screens above the active one", () => {
    expect(getDeepLinkDismissals(rootState([planner, deepLinkedRouteList, routeDetails], { index: 1 }))?.deepLinkedScreens).toBe(
      1,
    )
    expect(getDeepLinkDismissals(rootState([planner, deepLinkedRouteList], { index: 0 }))?.deepLinkedScreens).toBe(0)
  })

  it("dismisses modals covering the main stack, along with the previous deep link under them", () => {
    expect(getDeepLinkDismissals(rootState([planner, deepLinkedRouteList, routeDetails], { modals: [activeRide] }))).toEqual({
      parentKey: "navigator:0",
      modals: 1,
      deepLinkedScreens: 2,
    })
  })

  it("handles a navigator that hasn't mounted yet", () => {
    expect(getDeepLinkDismissals(undefined)).toBeUndefined()
    expect(getDeepLinkDismissals({ routes: [{ name: "__root", state: { routes: [{ name: "(main)" }] } }] })).toBeUndefined()
  })
})
