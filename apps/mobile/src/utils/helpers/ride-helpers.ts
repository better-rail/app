import { addMinutes, differenceInSeconds } from "date-fns"
import { isEqual } from "lodash"
import type { RideStatus } from "@/hooks/use-ride-progress"
import type { RouteItem, Train } from "@/services/api"

/**
 * Find the closest station to the current time.
 */
export function findClosestStationInRoute(route: RouteItem) {
  const now = Date.now()

  for (let train of route.trains) {
    const delay = train.delay

    const departureTime = addMinutes(train.departureTime, delay)
    const arrivalTime = addMinutes(train.arrivalTime, delay)

    if (addMinutes(departureTime, 1).getTime() > now) {
      return train.originStationId
    } else {
      for (let station of train.stopStations) {
        if (addMinutes(station.departureTime, delay + 1).getTime() > now) {
          return station.stationId
        }
      }
    }

    if (arrivalTime.getTime() > now) {
      return train.destinationStationId
    }
  }

  // the ride has ended - fall back to the final destination
  return route.trains[route.trains.length - 1].destinationStationId
}

/// Get the train which includes the provided stop station
export function getTrainFromStationId(route: RouteItem, stationId: number): Train | undefined {
  // lookup for the station in the stop stations list
  const train = route.trains.find((train) => {
    return !!train.stopStations.find((s) => s.stationId === stationId)
  })

  if (train) return train

  // not in the stop stations? it's probably the origin / destination station!
  return (
    route.trains.find((t) => t.originStationId === stationId) || route.trains.find((t) => t.destinationStationId === stationId)
  )
}

export function getPreviousTrainFromStationId(route: RouteItem, stationId: number): Train | null {
  // the current station train
  const train = getTrainFromStationId(route, stationId)
  if (!train) return null
  const trainIndex = route.trains.findIndex((current) => current.trainNumber === train.trainNumber)

  if (trainIndex < 1) return null
  else return route.trains[trainIndex - 1]
}

export function getSelectedRide(routes: RouteItem[], rideTrainNumbers: number[]) {
  return routes.find((route) =>
    isEqual(
      route.trains.map((train) => train.trainNumber),
      rideTrainNumbers,
    ),
  )
}

export function getRideStatus(
  route: RouteItem,
  train: Train | undefined,
  nextStationId: number,
  delay: number = train?.delay ?? 0,
): RideStatus {
  // the station isn't part of any train in this route - we can't tell where the ride is
  if (!train) return "loading"

  if (train.originStationId === nextStationId) {
    if (route.trains[0].originStationId == train.originStationId) {
      return "waitForTrain"
    }

    const previousTrain = getPreviousTrainFromStationId(route, nextStationId)
    if (previousTrain) {
      const arrivalTimeToExchangeStation = addMinutes(previousTrain.arrivalTime, delay)
      const timeToExchange = differenceInSeconds(arrivalTimeToExchangeStation, new Date())

      if (timeToExchange <= 0) {
        return getRideStatus(route, previousTrain, nextStationId)
      }
    }
  }

  if (train.destinationStationId === nextStationId) {
    const nextTrain = getTrainFromStationId(route, nextStationId)
    const arrivalTime = addMinutes(train.arrivalTime, delay)
    const timeToArrival = differenceInSeconds(arrivalTime, new Date())

    if (nextTrain && addMinutes(nextTrain.departureTime, delay).getTime() >= Date.now()) {
      return "inExchange"
    } else if (timeToArrival >= 0) {
      return "inTransit"
    } else {
      return "arrived"
    }
  }

  return "inTransit"
}
