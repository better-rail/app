import { RouteItem, Train } from "../../services/api"
import { isEqual } from "lodash"

/**
 * Find the closest station to the current time.
 */
export function findClosestStationInRoute(route: RouteItem) {
  const now = Date.now()
  const delay = route.delay

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

export function getSelectedRide(routes: RouteItem[], rideTrainNumbers: number[]) {
  return routes.find((route) =>
    isEqual(
      route.trains.map((train) => train.trainNumber),
      rideTrainNumbers,
    ),
  )
}
