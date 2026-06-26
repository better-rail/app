import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { differenceInMinutes } from "date-fns"
import { RouteItem } from "../../services/api"
import { useRideRoute, getStopStationStatus, useRideStatus, getStatusEndDate } from "./"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived" | "stale"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })
  const stations = getStopStationStatus({ route, nextStationId, status, enabled })

  const calculateMinutesLeft = () => {
    const date = getStatusEndDate(route, {
      delay,
      status,
      nextStationId,
    })
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
  }, [status, delay, nextStationId])

  return { status, minutesLeft, stations, nextStationId }
}
