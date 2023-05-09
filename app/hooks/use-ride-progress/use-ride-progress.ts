import { useEffect, useState } from "react"
import { differenceInMinutes } from "date-fns"
import { getTrainFromStationId } from "../../utils/helpers/ride-helpers"
import { RouteItem } from "../../services/api"
import { useRideStatus } from "./use-ride-status"
import { useRideRoute } from "./use-ride-route"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress(route: RouteItem) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })

  // update minutes left
  const calculateMinutesLeft = () => {
    let minutes = 0
    const train = getTrainFromStationId(route, nextStationId)

    if (status == "inTransit") {
      minutes = differenceInMinutes(train.arrivalTime, Date.now(), { roundingMethod: "ceil" }) + delay
    } else if (status == "waitForTrain" || status == "inExchange") {
      minutes = differenceInMinutes(train.departureTime, Date.now(), { roundingMethod: "ceil" }) + delay
    }

    setMinutesLeft(minutes)
  }

  useEffect(() => {
    setInterval(() => {
      calculateMinutesLeft()
    }, 1000 * 60)

    calculateMinutesLeft()
  }, [status, delay, nextStationId])

  return [status, minutesLeft] as const
}
