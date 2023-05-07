import { useEffect, useState } from "react"
import { RouteItem } from "../services/api"
import { findClosestStationInRoute, getTrainFromStationId } from "../utils/helpers/ride-helpers"

type RideStatus = "waitForTrain" | "inTransit" | "inExchange" | "arrived"

export function useRideProgress(route: RouteItem) {
  // initial state
  const [status, setStatus] = useState<RideStatus>("waitForTrain")
  const [nextStationId, setNextStationId] = useState<number>(route.trains[0].originStationId)
  const [delay, setDelay] = useState<number>(0)

  useEffect(() => {
    // create a timer that runs every 1 minute
    const timer = setInterval(() => {
      const stationId = findClosestStationInRoute(route)
      setNextStationId(stationId)

      // fetch route

      // update the delay
    }, 60000)

    const stationId = findClosestStationInRoute(route)
    setNextStationId(stationId)
    setDelay(route.delay)

    // clear the timer when the component unmounts
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // get the current station
    const train = getTrainFromStationId(route, nextStationId)

    if (route.trains[0].originStationId != train.originStationId) {
      // not the first train, possibly an exchange
      if (train.originStationId == nextStationId) {
        setStatus("inExchange")
      }
    } else if (train.originStationId != nextStationId) {
      setStatus("inTransit")
    } else if (Date.now() > route.trains[route.trains.length - 1].arrivalTime) {
      setStatus("arrived")
    }
  }, [nextStationId])

  return { status, nextStationId }
}
