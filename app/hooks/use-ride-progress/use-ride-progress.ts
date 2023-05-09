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
  const stations = getStationProgress(route, nextStationId)

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

  return [status, minutesLeft, stations] as const
}

/**
 *
 * @param nextStationId
 */
function getStationProgress(route: RouteItem, nextStationId: number) {
  const stations = []
  // We use the `nextStationId` to create an array the stations that we have passed already.
  // Note: There are number of trains. we need to find the train that has the `nextStationId`
  const train = getTrainFromStationId(route, nextStationId)

  // Good! Before we proceed, we need to check if the train is the first train in the route. if it is not, then we need to
  // add the stations of the previous trains to the array
  const trainIndex = route.trains.indexOf(train)
  if (trainIndex !== 1) {
    // we need to add the stations of the previous trains to the array
    for (let i = 0; i < trainIndex; i++) {
      stations.push(route.trains[i].originStationId)
      stations.push([...route.trains[i].stopStations.map((s) => s.stationId)])
      stations.push(route.trains[i].destinationStationId)
    }
  }

  // Hurray! Now we need to add the stations of the current train to the array
  // We need to look through the train originStation, stopStations and check if one of them equals
  // to the `nextStationId`.
  // If it's not, we add the station id to the array, until we find the `nextStationId`.
  // Note: We won't check for the destinationStationId, because the UI will mark it as 'visited' if the ride
  // status is set to `arrived`.

  if (train.originStationId !== nextStationId) {
    stations.push(train.originStationId)

    for (let i = 0; i < train.stopStations.length; i++) {
      if (train.stopStations[i].stationId !== nextStationId) {
        stations.push(train.stopStations[i].stationId)
      } else {
        // we found the nextStationId, so we break the loop
        break
      }
    }
  }

  return stations
}
