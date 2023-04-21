import { NativeModules } from "react-native"
import { RouteItem } from "../services/api"

const { RNBetterRail } = NativeModules

export function donateRouteIntent(originId: string, destinationId: string) {
  RNBetterRail.donateRouteIntent(originId, destinationId)
}

export function reloadAllTimelines() {
  RNBetterRail.reloadAllTimelines()
}

export function monitorLiveActivities() {
  RNBetterRail.monitorActivities()
}

function prepareDataForLiveActivities(route: RouteItem) {
  const modifiedRoute = { ...route }
  // @ts-expect-error
  modifiedRoute.arrivalTime = new Date(route.arrivalTime).toISOString()
  // @ts-expect-error
  modifiedRoute.departureTime = new Date(route.departureTime).toISOString()

  modifiedRoute.trains = modifiedRoute.trains.map((train) => {
    const modifiedTrain = { ...train }
    // @ts-expect-error
    modifiedTrain.arrivalTime = new Date(train.arrivalTime).toISOString()

    // @ts-expect-error
    modifiedTrain.departureTime = new Date(train.arrivalTime).toISOString()

    // @ts-expect-error
    modifiedTrain.destPlatform = train.destinationPlatform

    // @ts-expect-error
    modifiedTrain.orignStation = train.originStationId

    // @ts-expect-error
    modifiedTrain.destinationStation = train.destinationStationId

    modifiedTrain.stopStations = train.stopStations.map((stopStation) => {
      const modifiedStopStation = { ...stopStation }
      // @ts-expect-error
      modifiedStopStation.arrivalTime = new Date(stopStation.arrivalTime).toISOString()
      // @ts-expect-error
      modifiedStopStation.departureTime = new Date(stopStation.departureTime).toISOString()
      return modifiedStopStation
    })

    return modifiedTrain
  })

  return modifiedRoute
}

export async function startLiveActivity(route: RouteItem) {
  try {
    const modifiedRoute = prepareDataForLiveActivities(route)
    const routeJSON = JSON.stringify(modifiedRoute)

    const result = await RNBetterRail.startActivity(routeJSON)

    return result
  } catch (err) {
    console.log(err)
    throw err
  }
}
