import { describe, expect, test } from "bun:test"
import { format } from "date-fns"
import { getE2ERoutes } from "./e2e-route-fixtures"

describe("Maestro route fixtures", () => {
  test("returns stable direct and exchange routes for the requested journey", () => {
    const routes = getE2ERoutes("680", "4600", "2026-09-08", "08:00")

    expect(routes).toHaveLength(2)
    expect(routes[0].isExchange).toBe(false)
    expect(routes[0].trains).toHaveLength(1)
    expect(routes[1].isExchange).toBe(true)
    expect(routes[1].trains).toHaveLength(2)

    for (const route of routes) {
      expect(route.trains[0].originStationId).toBe(680)
      expect(route.trains.at(-1)?.destinationStationId).toBe(4600)
      expect(route.departureTime).toBeGreaterThan(new Date(2026, 8, 8, 8).getTime())
      expect(route.trains[0].visaWagonData?.wagons).toHaveLength(4)
    }
  })

  test("returns the same selected train when route details poll from its departure time", () => {
    const routes = getE2ERoutes("680", "4600", "2026-09-08", "08:00")

    for (const route of routes) {
      const departure = new Date(route.departureTime)
      const refreshedRoutes = getE2ERoutes("680", "4600", format(departure, "yyyy-MM-dd"), format(departure, "HH:mm"))
      const trainNumbers = route.trains.map((train) => train.trainNumber)
      const refreshedRoute = refreshedRoutes.find(
        (candidate) => candidate.trains.map((train) => train.trainNumber).join() === trainNumbers.join(),
      )

      expect(refreshedRoute?.departureTime).toBe(route.departureTime)
      expect(refreshedRoute?.arrivalTime).toBe(route.arrivalTime)
    }
  })

  test("honors the hide-slow-trains option", () => {
    const routes = getE2ERoutes("680", "4600", "2026-09-08", "08:00", { hideSlowTrains: true })

    expect(routes).toHaveLength(1)
    expect(routes[0].isExchange).toBe(false)
    expect(routes[0].isMuchLonger).toBe(false)
  })
})
