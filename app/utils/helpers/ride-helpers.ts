import { RouteItem, Train } from "../../services/api"

/**
 * Find the closest station to the current time.
 */
export function findClosestStationInRoute(route: RouteItem) {
  const now = Date.now() - 9000000

  for (let i = 0; i < route.trains.length; i++) {
    const train = route.trains[i]
    const departureTime = train.departureTime
    const arrivalTime = train.arrivalTime

    if (departureTime > now) {
      return train.originStationId
    } else {
      for (let j = 0; j < train.stopStations.length; j++) {
        const station = train.stopStations[j]
        if (station.arrivalTime > now) {
          return station.stationId
        }
      }
    }
    if (arrivalTime > now) {
      return train.destinationStationId
    }
  }

  return route.trains[0].originStationId
}

/// Get the train which includes the provided stop station
export function getTrainFromStationId(route: RouteItem, stationId: number): Train {
  // lookup for the station in the stop stations list
  const train = route.trains.find((train) => {
    return !!train.stopStations.find((s) => s.stationId === stationId)
  })

  // not in the stop stations? it's probably the origin / destination station!
  return (
    route.trains.find((t) => t.originStationId === stationId) || route.trains.find((t) => t.destinationStationId === stationId)
  )
}

function isEqual(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length) {
    return false
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }

  return true
}

export function getSelectedRide(routes: RouteItem[], rideTrainNumbers: number[]) {
  return routes.find((route) =>
    isEqual(
      route.trains.map((train) => train.trainNumber),
      rideTrainNumbers,
    ),
  )
}
