import { useEffect, useState } from "react"
import { differenceInMinutes } from "date-fns"
import { RouteItem } from "../../services/api"
import { getTrainFromStationId } from "../../utils/helpers/ride-helpers"
import { useRideRoute, getStopStationStatus, useRideStatus } from "./"

export type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress({ route, enabled }: { route: RouteItem; enabled: boolean }) {
  const [minutesLeft, setMinutesLeft] = useState<number>(0)
  const [delay, nextStationId] = useRideRoute(route)
  const status = useRideStatus({ route, delay, nextStationId })
  const stations = getStopStationStatus({ route, nextStationId, status, enabled })

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
    const timer = setInterval(() => {
      calculateMinutesLeft()
    }, 1000 * 60)

    calculateMinutesLeft()

    return () => clearInterval(timer)
  }, [status, delay, nextStationId])

  return { status, minutesLeft, stations, nextStationId }
}
