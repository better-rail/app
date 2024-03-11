import { NativeModules, Platform } from "react-native"
import { RouteItem } from "../services/api"

const { RNBetterRail } = NativeModules

export async function canRunLiveActivities() {
  const isRunningOnMac = await RNBetterRail.isRunningOnMac()
  const deviceSupported = Platform.OS == "ios" && parseFloat(Platform.Version) >= 16.2

  return deviceSupported && !isRunningOnMac
}

export function donateRouteIntent(originId: string, destinationId: string) {
  RNBetterRail.donateRouteIntent(originId, destinationId)
}

export function reloadAllTimelines() {
  RNBetterRail.reloadAllTimelines()
}

export function monitorLiveActivities() {
  RNBetterRail.monitorActivities()
}

export type ActivityAuthorizationInfo = { areActivitiesEnabled: boolean; frequentPushesEnabled: boolean }

export async function activityAuthorizationInfo(): Promise<ActivityAuthorizationInfo> {
  return RNBetterRail.activityAuthorizationInfo("")
}

function prepareDataForLiveActivities(route: RouteItem) {
  // We need to modify the route the fit the original data structure, which we use in the native code
  const modifiedRoute = { ...route }
  // @ts-expect-error
  modifiedRoute.arrivalTime = route.arrivalTimeString
  // @ts-expect-error
  modifiedRoute.departureTime = route.departureTimeString

  modifiedRoute.trains = modifiedRoute.trains.map((train) => {
    const modifiedTrain = { ...train }
    // @ts-expect-error
    modifiedTrain.arrivalTime = train.arrivalTimeString

    // @ts-expect-error
    modifiedTrain.departureTime = train.departureTimeString

    // @ts-expect-error
    modifiedTrain.destPlatform = train.destinationPlatform

    // @ts-expect-error
    modifiedTrain.orignStation = train.originStationId

    // @ts-expect-error
    modifiedTrain.destinationStation = train.destinationStationId

    modifiedTrain.stopStations = train.stopStations.map((stopStation) => {
      const modifiedStopStation = { ...stopStation }
      // @ts-expect-error
      modifiedStopStation.arrivalTime = stopStation.arrivalTimeString
      // @ts-expect-error
      modifiedStopStation.departureTime = stopStation.departureTimeString
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

    const rideId: string = await RNBetterRail.startActivity(routeJSON)
    return rideId
  } catch (err) {
    console.error("Error starting live activity", err)
    throw err
  }
}

export async function endLiveActivity(routeId: string) {
  try {
    return (await RNBetterRail.endActivity(routeId)) as boolean
  } catch (err) {
    console.error(err)
    throw err
  }
}

export async function isRideActive(routeId: string) {
  const result: string = await RNBetterRail.isRideActive(routeId)
  if (result) return JSON.parse(result) as { rideId: string; token: string }[]
  return []
}

export default {
  donateRouteIntent,
  reloadAllTimelines,
  monitorLiveActivities,
  startLiveActivity,
  endLiveActivity,
  isRideActive,
  canRunLiveActivities,
  activityAuthorizationInfo,
}
