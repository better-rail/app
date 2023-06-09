import { useEffect, useState } from "react"
import { AppState, AppStateStatus } from "react-native"
import { addMinutes, differenceInMinutes } from "date-fns"
import { RouteItem } from "../../services/api"
import { getPreviousTrainFromStationId, getTrainFromStationId } from "../../utils/helpers/ride-helpers"
import { useRideRoute, getStopStationStatus, useRideStatus } from "./"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })
  const stations = getStopStationStatus({ route, nextStationId, status, enabled })

  const calculateMinutesLeft = () => {
    let date: Date
    const train = getTrainFromStationId(route, nextStationId)

    const departureDate = addMinutes(train.departureTime, delay)
    const arrivalDate = addMinutes(train.arrivalTime, delay)

    if (status === "waitForTrain" || status === "inExchange") {
      date = departureDate
    } else if (status === "inTransit" && train.originStationId === nextStationId && departureDate.getTime() > Date.now()) {
      const previousTrain = getPreviousTrainFromStationId(route, nextStationId) ?? train
      date = addMinutes(previousTrain.arrivalTime, delay)
    } else {
      date = arrivalDate
    }

    setMinutesLeft(differenceInMinutes(date, Date.now(), { roundingMethod: "ceil" }))
  }

  useEffect(() => {
    const timer = setInterval(() => {
      calculateMinutesLeft()
    }, 1000 * 60)

    calculateMinutesLeft()

    return () => clearInterval(timer)
  }, [status, delay, nextStationId])

  useEffect(() => {
    // recalculate time left route when the user comes back to the app
    const listener = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") calculateMinutesLeft()
    }

    const subscription = AppState.addEventListener("change", listener)
    return () => subscription.remove()
  }, [])

  return { status, minutesLeft, stations, nextStationId }
}
