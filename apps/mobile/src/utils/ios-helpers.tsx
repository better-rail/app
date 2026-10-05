import { NativeModules, Platform } from "react-native"
import { RouteItem } from "@/services/api"
import { RideStartError } from "./helpers/ride-errors"
import { IS_E2E } from "@/config/e2e"

const { RNBetterRail } = NativeModules

export async function canRunLiveActivities() {
  if (IS_E2E) return true

  const isRunningOnMac = await RNBetterRail.isRunningOnMac()
  const deviceSupported = Platform.OS == "ios" && parseFloat(Platform.Version) >= 16.2

  return deviceSupported && !isRunningOnMac
}

export function donateRouteIntent(originId: string, destinationId: string) {
  if (Platform.OS === "ios" && RNBetterRail) {
    RNBetterRail.donateRouteIntent(originId, destinationId)
  }
}

export function reloadAllTimelines() {
  if (Platform.OS === "ios" && RNBetterRail) {
    RNBetterRail.reloadAllTimelines()
  }
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
    // Tagged like the Android stages, so an iOS failure isn't reported as an untyped error.
    throw new RideStartError("live_activity", "Couldn't start the live activity", { cause: err })
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

export type ArrivalAlarmAuthorization = "unsupported" | "notDetermined" | "denied" | "authorized"

/** AlarmKit needs iOS 26, and a binary that has the native module (an OTA update can reach an older one) */
export const isArrivalAlarmSupported = () =>
  Platform.OS === "ios" && parseFloat(String(Platform.Version)) >= 26 && typeof RNBetterRail?.scheduleArrivalAlarm === "function"

export async function arrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return RNBetterRail.arrivalAlarmAuthorization()
}

export async function requestArrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return RNBetterRail.requestArrivalAlarmAuthorization()
}

/** Schedules the alarm, replacing one with the same id. Resolves with when it will ring, in ms. */
export async function scheduleArrivalAlarm(alarm: {
  rideId: string
  alarmId: string
  fireDate: number
  title: string
  stopText: string
}): Promise<number> {
  return RNBetterRail.scheduleArrivalAlarm(alarm)
}

/** Applies an arrival-alarm push (`fireDate` in seconds, as the server sends it). False when it couldn't move the alarm. */
export async function moveArrivalAlarm(push: { rideId: string; alarmId: string; fireDate: number }): Promise<boolean> {
  return RNBetterRail.moveArrivalAlarm(push)
}

export function cancelArrivalAlarm() {
  RNBetterRail.cancelArrivalAlarm()
}

/** The alarm as the device has it, which the notification service extension may have moved */
export async function getArrivalAlarm(): Promise<{
  rideId: string
  alarmId: string
  fireDate: number
  isScheduled: boolean
} | null> {
  return RNBetterRail.getArrivalAlarm()
}

export default {
  cancelArrivalAlarm,
  donateRouteIntent,
  reloadAllTimelines,
  monitorLiveActivities,
  startLiveActivity,
  endLiveActivity,
  isRideActive,
  canRunLiveActivities,
  activityAuthorizationInfo,
}
