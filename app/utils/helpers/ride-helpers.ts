import { addMinutes, differenceInSeconds } from "date-fns"
import { RideStatus } from "../../hooks/use-ride-progress"
import { RouteItem, Train } from "../../services/api"
import { isEqual } from "lodash"

/**
 * Find the closest station to the current time.
 */
export function findClosestStationInRoute(route: RouteItem) {
  const now = Date.now()
  const delay = route.delay * 60 * 1000

  for (let i = 0; i < route.trains.length; i++) {
    const train = route.trains[i]
    const departureTime = train.departureTime + delay
    const arrivalTime = train.arrivalTime + delay

    if (departureTime > now) {
      return train.originStationId
    } else {
      for (let j = 0; j < train.stopStations.length; j++) {
        const station = train.stopStations[j]
        const arrivalTime = station.arrivalTime + delay
        if (arrivalTime > now) {
          return station.stationId
        }
      }
    }
    if (arrivalTime + delay > now) {
      return train.destinationStationId
    }
  }

  // if we're here, we're probably at the end of the route
  if (now > route.trains[route.trains.length - 1].arrivalTime + delay) {
    return route.trains[route.trains.length - 1].destinationStationId
  }

  // default to the first station
  return route.trains[0].destinationStationId
}

/// Get the train which includes the provided stop station
export function getTrainFromStationId(route: RouteItem, stationId: number): Train {
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

export function getRideStatus(route: RouteItem, train: Train, nextStationId: number, delay: number = train.delay): RideStatus {
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

  if (train.destinationStationId == nextStationId) {
    const departureTime = addMinutes(train.departureTime, delay)
    const arrivalTime = addMinutes(train.arrivalTime, delay)
    const timeToArrival = differenceInSeconds(arrivalTime, new Date())

    if (departureTime.getTime() >= Date.now()) {
      return "inExchange"
    } else if (timeToArrival >= 0) {
      return "inTransit"
    } else {
      return "arrived"
    }
  }

  return "inTransit"
}
