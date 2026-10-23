import type { RouteItem } from "."
import { routeDurationInMs } from "@/utils/helpers/date-helpers"

// Same window as isOneHourDifference, without date-fns: this runs for every pair of loaded routes
const isOneHourDifference = (a: number, b: number) => Math.abs(a - b) <= 59 * 60 * 1000

// Flags are relative to the routes compared against, so compute them over every route on display
export function withDurationFlags(routes: RouteItem[]): RouteItem[] {
  return routes.map((route) => ({
    ...route,
    isMuchLonger: isRouteIsMuchLongerThanOtherRoutes(route, routes),
    isMuchShorter: isRouteMuchShorterThanOtherRoutes(route, routes),
  }))
}

function isRouteIsMuchLongerThanOtherRoutes(route: RouteItem, otherRoutes: RouteItem[]): boolean {
  const routeDuration = routeDurationInMs(route.departureTime, route.arrivalTime)

  // TODO: Iterate only on the routes that are 1 hour around the route
  // currently we iterating on all the routes which is unecessary

  // iterate on routes that are before and after 1 hour the current route,
  // and check if they're shorther by 30 minutes or more than the current route.
  const longRoutesAround = otherRoutes.filter((otherRoute) => {
    const withinRange = isOneHourDifference(route.trains[0].departureTime, otherRoute.trains[0].departureTime)
    if (!withinRange) return false

    // check if the other route is much longer than the current route
    const otherRouteDuration = routeDurationInMs(otherRoute.departureTime, otherRoute.arrivalTime)

    // Usually, we only show the user a long route warning if there is a difference of 30 minutes.
    // When the current route involves a change and the other does not, we want to reduce the difference
    // to 15 minutes so that people will choose a more comfortable journey.
    const minutesForMuchLonger = route.isExchange && !otherRoute.isExchange ? 15 : 30
    return routeDuration - otherRouteDuration >= minutesForMuchLonger * 60 * 1000
  })

  if (longRoutesAround.length > 0) return true
  return false
}

function isRouteMuchShorterThanOtherRoutes(route: RouteItem, otherRoutes: RouteItem[]): boolean {
  const routeDuration = routeDurationInMs(route.departureTime, route.arrivalTime)

  const shortRoutesAround = otherRoutes.filter((otherRoute) => {
    const withinRange = isOneHourDifference(route.trains[0].departureTime, otherRoute.trains[0].departureTime)
    if (!withinRange) return false

    // check if the other route is much shorter than the current route
    const otherRouteDuration = routeDurationInMs(otherRoute.departureTime, otherRoute.arrivalTime)

    // Usually, we only show that a shorter route is available if there is a difference of 30 minutes.
    // When the other route involves a change and the current does not, we want to reduce the difference
    // to 15 minutes so that people will choose a more comfortable journey.
    const minutesForMuchShorter = !route.isExchange && otherRoute.isExchange ? 15 : 30
    return otherRouteDuration - routeDuration >= minutesForMuchShorter * 60 * 1000
  })

  if (shortRoutesAround.length > 0) return true
  return false
}
