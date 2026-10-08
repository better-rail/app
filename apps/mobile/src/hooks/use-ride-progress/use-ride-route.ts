import type { RouteItem } from "@/services/api"
import { useQuery } from "react-query"
import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { RouteApi } from "@/services/api/route-api"
import { findClosestStationInRoute, getTrainFromStationId } from "@/utils/helpers/ride-helpers"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models/ride/ride"
import { refetchRideRoute } from "./refetch-ride-route"

const api = new RouteApi()

/**
 * Track progress against the displayed route and refresh an active ride's live data.
 */
export function useRideRoute(route: RouteItem) {
  // Select the value itself: the stable store action can be memoized by React
  // Compiler even when the active ride it reads has changed.
  const { isActive, setRoute } = useRideStore(useShallow((s) => ({ isActive: s.isRouteActive(route), setRoute: s.setRoute })))
  const [now, setNow] = useState(Date.now)
  const originId = route.trains[0].originStationId
  const destinationId = route.trains[route.trains.length - 1].destinationStationId
  const trainNumbers = route.trains.map((train) => train.trainNumber)

  // Route details already polls inactive routes. React Query also refreshes on app focus,
  // and keeps requests for different transfer selections in separate cache entries.
  useQuery(
    ["rideRoute", originId, destinationId, route.departureTime, route.viaStationId, ...trainNumbers],
    () => refetchRideRoute(api, route),
    {
      enabled: isActive,
      refetchInterval: 60_000,
      onSuccess: (updatedRoute) => {
        const currentRoute = useRideStore.getState().route
        // A pending refresh mustn't replace a newer transfer selection or a different ride.
        if (
          updatedRoute &&
          currentRoute &&
          useRideStore.getState().isRouteActive(updatedRoute) &&
          currentRoute.viaStationId === updatedRoute.viaStationId &&
          currentRoute.trains.map((train) => train.trainNumber).join() === trainNumbers.join()
        ) {
          setRoute(updatedRoute)
        }
      },
    },
  )

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    const timer = setInterval(updateNow, 60_000)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") updateNow()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    setNow(Date.now())
  }, [route])

  // Derive these together from the current prop, so selecting a transfer updates the
  // countdown immediately and a fresh station is never paired with an older route.
  const nextStationId = findClosestStationInRoute(route, now)
  const delay = getTrainFromStationId(route, nextStationId)?.delay ?? 0

  return { delay, nextStationId, activeRoute: route, now }
}
