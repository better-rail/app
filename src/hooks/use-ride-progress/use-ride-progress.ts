import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { differenceInMinutes } from "date-fns"
import { RouteItem } from "@/services/api"
import { useRideRoute } from "./use-ride-route"
import { getStopStationStatus } from "./get-stop-stations-status"
import { useRideStatus } from "./use-ride-status"
import { getStatusEndDate } from "./utils"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived" | "stale" | "loading"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  // always resolve `nextStationId` against the route it was found in, never the `route` prop -
  // the two drift apart when a refetch changes the route's stop stations
  const { delay, nextStationId, activeRoute } = useRideRoute(route)
  const status = useRideStatus({ route: activeRoute, delay, nextStationId })
  const stations = getStopStationStatus({ route: activeRoute, nextStationId, status, enabled })

  const calculateMinutesLeft = () => {
    const date = getStatusEndDate(activeRoute, {
      delay,
      status,
      nextStationId,
    })
    // no end date means we couldn't resolve the train or its times - keep the last known value
    // rather than rendering NaN
    if (!date) return

    setMinutesLeft(differenceInMinutes(date, Date.now(), { roundingMethod: "ceil" }))
  }

  useEffect(() => {
    const timer = setInterval(() => {
      calculateMinutesLeft()
    }, 1000 * 60)

    calculateMinutesLeft()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        calculateMinutesLeft()
      }
    })

    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [status, delay, nextStationId, activeRoute])

  return { status, minutesLeft, stations, nextStationId }
}
