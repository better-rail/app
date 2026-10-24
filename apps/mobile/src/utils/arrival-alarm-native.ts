import { NativeModules, Platform } from "react-native"
import { getVersion } from "react-native-device-info"

// iOS: AlarmKit, in the RNBetterRail module. Android: an exact AlarmManager alarm that rings from a foreground service.
const native = Platform.OS === "ios" ? NativeModules.RNBetterRail : NativeModules.ArrivalAlarm

export type ArrivalAlarmAuthorization = "unsupported" | "notDetermined" | "denied" | "authorized"

/** AlarmKit needs iOS 26. Both need a binary that has the native module (an OTA update can reach an older one). Ships with v3. */
export const isArrivalAlarmSupported = () => {
  if (typeof native?.scheduleArrivalAlarm !== "function") return false
  if (Number(getVersion().split(".")[0]) < 3) return false
  if (Platform.OS === "ios") return parseFloat(String(Platform.Version)) >= 26
  return Platform.OS === "android"
}

export async function arrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return native.arrivalAlarmAuthorization()
}

export async function requestArrivalAlarmAuthorization(): Promise<ArrivalAlarmAuthorization> {
  return native.requestArrivalAlarmAuthorization()
}

/** Schedules an alarm for each stop, replacing the current alarm. Resolves with when each will ring, in ms. */
export async function scheduleArrivalAlarm(alarm: {
  rideId: string
  alarmId: string
  stopText: string
  stops: { train: number; title: string; fireDate: number }[]
}): Promise<{ train: number; fireDate: number }[]> {
  return native.scheduleArrivalAlarm(alarm)
}

export type ArrivalAlarmPush = { rideId: string; alarmId: string; stops: { train: number; fireDate: number }[] }

/**
 * Applies an arrival-alarm push (fire dates in seconds, as the server sends them) to the stops that didn't ring yet.
 * False when it couldn't move them.
 */
export async function moveArrivalAlarm(push: ArrivalAlarmPush): Promise<boolean> {
  return native.moveArrivalAlarm(push)
}

export function cancelArrivalAlarm() {
  native?.cancelArrivalAlarm?.()
}

/** The alarm as the device has it, which a push may have moved while the app wasn't running */
export async function getArrivalAlarm(): Promise<{
  rideId: string
  alarmId: string
  /** `isScheduled` is false once a stop's alarm rang */
  stops: { train: number; fireDate: number; isScheduled: boolean }[]
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
