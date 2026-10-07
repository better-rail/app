import { NativeModules, Platform } from "react-native"

// iOS: AlarmKit, in the RNBetterRail module. Android: an exact AlarmManager alarm that rings from a foreground service.
const native = Platform.OS === "ios" ? NativeModules.RNBetterRail : NativeModules.ArrivalAlarm

export type ArrivalAlarmAuthorization = "unsupported" | "notDetermined" | "denied" | "authorized"

/** AlarmKit needs iOS 26. Both need a binary that has the native module (an OTA update can reach an older one). */
export const isArrivalAlarmSupported = () => {
  if (typeof native?.scheduleArrivalAlarm !== "function") return false
  if (Platform.OS === "ios") return parseFloat(String(Platform.Version)) >= 26
  return Platform.OS === "android"
}

export async function arrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return native.arrivalAlarmAuthorization()
}

export async function requestArrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return native.requestArrivalAlarmAuthorization()
}

/** Schedules the alarm, replacing one with the same id. Resolves with when it will ring, in ms. */
export async function scheduleArrivalAlarm(alarm: {
  rideId: string
  alarmId: string
  fireDate: number
  title: string
  stopText: string
}): Promise<number> {
  return native.scheduleArrivalAlarm(alarm)
}

/** Applies an arrival-alarm push (`fireDate` in seconds, as the server sends it). False when it couldn't move the alarm. */
export async function moveArrivalAlarm(push: { rideId: string; alarmId: string; fireDate: number }): Promise<boolean> {
  return native.moveArrivalAlarm(push)
}

export function cancelArrivalAlarm() {
  native?.cancelArrivalAlarm?.()
}

/** The alarm as the device has it, which a push may have moved while the app wasn't running */
export async function getArrivalAlarm(): Promise<{
  rideId: string
  alarmId: string
  fireDate: number
  isScheduled: boolean
} | null> {
  return native.getArrivalAlarm()
}

/** Android: whether the alarm can take over the lock screen. Without it, it rings as a heads-up notification. */
export async function canUseFullScreenAlarm(): Promise<boolean> {
  if (Platform.OS !== "android") return true
  return native.canUseFullScreenIntent()
}

/** Android: opens the setting the alarm is missing. `fullScreen` for the lock screen takeover, otherwise exact alarms or notifications. */
export function openArrivalAlarmSettings(kind: "fullScreen" | "permissions") {
  native.openArrivalAlarmSettings(kind)
}
