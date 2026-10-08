import { useEffect, useState } from "react"
import { differenceInMinutes } from "date-fns"
import { RouteItem } from "@/services/api"
import { useRideRoute } from "./use-ride-route"
import { getStopStationStatus } from "./get-stop-stations-status"
import { useRideStatus } from "./use-ride-status"
import { getStatusEndDate } from "./utils"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived" | "stale" | "loading"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  // Resolve the station, status, and countdown against the same route and clock.
  const { delay, nextStationId, activeRoute, now } = useRideRoute(route)
  const status = useRideStatus({ route: activeRoute, delay, nextStationId, now })
  const stations = getStopStationStatus({ route: activeRoute, nextStationId, status, enabled })

  useEffect(() => {
    const date = getStatusEndDate(activeRoute, { delay, status, nextStationId }, now)
    // no end date means we couldn't resolve the train or its times - keep the last known value
    // rather than rendering NaN
    if (!date) return

    setMinutesLeft(differenceInMinutes(date, now, { roundingMethod: "ceil" }))
  }, [status, delay, nextStationId, activeRoute, now])

  return { status, minutesLeft, stations, nextStationId }
}
