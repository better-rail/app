import { describe, expect, it } from "bun:test"
import { countDeepLinkedScreens } from "./deep-link-route-list"

type Route = { name: string; params?: object; state?: { index?: number; routes: Route[] } }

// Mirrors expo-router's state: the app's layouts sit under its own `__root` navigator.
const rootState = (mainRoutes: Route[], { index = mainRoutes.length - 1, modal }: { index?: number; modal?: Route } = {}) => ({
  index: 0,
  routes: [
    {
      name: "__root",
      state: {
        index: modal ? 1 : 0,
        routes: [{ name: "(main)", state: { index, routes: mainRoutes } }, ...(modal ? [modal] : [])],
      },
    },
  ],
})

const planner = { name: "index" }
const searchedRouteList = { name: "route-list", params: { originId: "1600", destinationId: "3100" } }
const deepLinkedRouteList = { name: "route-list", params: { originId: "1600", destinationId: "3100", deepLink: "true" } }
const routeDetails = { name: "route-details" }

describe("countDeepLinkedScreens", () => {
  it("finds nothing before the first deep link", () => {
    expect(countDeepLinkedScreens(rootState([planner, searchedRouteList, routeDetails]))).toBe(0)
  })

  it("counts the previous deep-linked route list", () => {
    expect(countDeepLinkedScreens(rootState([planner, deepLinkedRouteList]))).toBe(1)
  })

  it("counts the screens opened on top of the previous deep link, but not the ones below it", () => {
    expect(countDeepLinkedScreens(rootState([planner, searchedRouteList, deepLinkedRouteList, routeDetails]))).toBe(2)
  })

  it("ignores preloaded screens above the active one", () => {
    expect(countDeepLinkedScreens(rootState([planner, deepLinkedRouteList, routeDetails], { index: 1 }))).toBe(1)
    expect(countDeepLinkedScreens(rootState([planner, deepLinkedRouteList], { index: 0 }))).toBe(0)
  })

  it("leaves the main stack alone while a modal covers it", () => {
    const modal = { name: "settings", state: { routes: [{ name: "index" }] } }
    expect(countDeepLinkedScreens(rootState([planner, deepLinkedRouteList], { modal }))).toBe(0)
  })

  it("handles a navigator that hasn't mounted yet", () => {
    expect(countDeepLinkedScreens(undefined)).toBe(0)
    expect(countDeepLinkedScreens({ routes: [{ name: "__root", state: { routes: [{ name: "(main)" }] } }] })).toBe(0)
  })
})
