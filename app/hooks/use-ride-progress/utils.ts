import { addMinutes } from "date-fns"
import { RouteItem } from "../../services/api"
import { getTrainFromStationId, getPreviousTrainFromStationId } from "../../utils/helpers/ride-helpers"
import { RideStatus } from "./use-ride-progress"

export type RideState = {
  status: RideStatus
  delay: number
  nextStationId: number
}

export const getStatusEndDate = (route: RouteItem, state: RideState) => {
  const train = getTrainFromStationId(route, state.nextStationId)
  const departureDate = addMinutes(train.departureTime, state.delay)
  const arrivalDate = addMinutes(train.arrivalTime, state.delay)

  if (state.status === "waitForTrain" || state.status === "inExchange") {
    return departureDate
  } else if (
    state.status === "inTransit" &&
    train.originStationId == state.nextStationId &&
    departureDate.getTime() > Date.now()
  ) {
    const previousTrain = getPreviousTrainFromStationId(route, state.nextStationId) ?? train
    return addMinutes(previousTrain.arrivalTime, state.delay)
  } else {
    return arrivalDate
  }
}

/**
 * Get information about the current ride progress
 * @returns A tuple made out of the (current stop station index, total stop station count)
 */
export const rideProgress = (route: RouteItem, nextStationId: number) => {
  const train = getTrainFromStationId(route, nextStationId)
  if (!train) return [0, 0]

  const totalStations = train.stopStations.length + 1
  const currentIndex = train.stopStations.findIndex((station) => station.stationId === nextStationId)
  if (currentIndex >= 0) {
    return [currentIndex, totalStations]
  } else {
    for (let index = 0; index < route.trains.length; index++) {
      if (nextStationId === route.trains[index].destinationStationId) {
        let stopStationsCount = route.trains[index].stopStations.length + 1
        return [stopStationsCount - 1, stopStationsCount]
      }
    }

    return [0, 0]
  }
}
