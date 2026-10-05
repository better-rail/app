import { AppState } from "react-native"
import * as Notifications from "expo-notifications"
import { addMinutes } from "date-fns"
import { last } from "lodash"
import { translate } from "@/i18n"
import { RouteItem } from "@/services/api"
import { RideApi } from "@/services/api/ride-api"
import { trackEvent } from "@/services/analytics"
import {
  arrivalAlarmAuthorization,
  cancelArrivalAlarm,
  getArrivalAlarm,
  isArrivalAlarmSupported,
  requestArrivalAlarmAuthorization,
  scheduleArrivalAlarm,
} from "@/utils/ios-helpers"
import { getStationById } from "@/data/stations"
import { ArrivalAlarm, useRideStore } from "./ride"

export const ARRIVAL_ALARM_LEAD_MINUTES = [3, 5, 7, 10, 15]

// Smaller moves aren't worth rescheduling.
const MIN_ALARM_MOVE_MS = 60 * 1000

const rideApi = new RideApi()

/** When the alarm should ring: `leadMinutes` before the ride's actual (delayed) arrival, in ms */
export const getArrivalAlarmFireDate = (route: RouteItem, leadMinutes: number) => {
  const lastTrain = last(route.trains)
  return addMinutes(lastTrain.arrivalTime, lastTrain.delay - leadMinutes).getTime()
}

// Not cryptographically strong, and doesn't need to be: it only tells one alarm from the next.
const createAlarmId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16)
  })

const schedule = (alarm: ArrivalAlarm, route: RouteItem) =>
  scheduleArrivalAlarm({
    ...alarm,
    title: translate("ride.alarmTitle", { station: last(route.trains).destinationStationName }),
    stopText: translate("ride.alarmStop"),
  })

export type EnableArrivalAlarmResult = "enabled" | "enabledWithoutUpdates" | "tooLate" | "denied" | "failed"

export async function enableArrivalAlarm(leadMinutes: number): Promise<EnableArrivalAlarmResult> {
  const { id: rideId, route } = useRideStore.getState()
  if (!rideId || !route) return "failed"

  const fireDate = getArrivalAlarmFireDate(route, leadMinutes)
  if (fireDate <= Date.now()) return "tooLate"

  let authorization = await arrivalAlarmAuthorization()
  if (authorization === "notDetermined") {
    authorization = await requestArrivalAlarmAuthorization()
  }
  if (authorization !== "authorized") return "denied"

  // A new id even when only the lead time changes, so a push for the old setting can't move it.
  const alarm: ArrivalAlarm = { rideId, alarmId: createAlarmId(), leadMinutes, fireDate }

  try {
    alarm.fireDate = await schedule(alarm, route)
  } catch {
    return "failed"
  }

  useRideStore.setState({ arrivalAlarm: alarm, pendingArrivalAlarmRemoval: undefined })
  trackEvent("arrival_alarm_enabled", { lead_minutes: leadMinutes })

  // The extension can only move the alarm through a notification the rider allows.
  const { granted } = await Notifications.requestPermissionsAsync()
  // Not awaited: the alarm already rings without the server, it just won't follow delays yet.
  syncArrivalAlarmWithServer()

  return granted ? "enabled" : "enabledWithoutUpdates"
}

export async function disableArrivalAlarm() {
  const { id: rideId, arrivalAlarm } = useRideStore.getState()
  if (!arrivalAlarm) return

  cancelArrivalAlarm()
  useRideStore.setState({ arrivalAlarm: undefined })
  trackEvent("arrival_alarm_disabled", { lead_minutes: arrivalAlarm.leadMinutes })

  // Retried on the next foreground, since the server would otherwise keep pushing moves for a gone alarm.
  if (rideId && !(await rideApi.removeRideAlarm(rideId))) {
    useRideStore.setState({ pendingArrivalAlarmRemoval: rideId })
  }
}

async function retryArrivalAlarmRemoval(pendingRideId: string, rideId: string | undefined) {
  // An ended ride took its server-side alarm with it.
  if (pendingRideId === rideId && !(await rideApi.removeRideAlarm(pendingRideId))) return

  if (useRideStore.getState().pendingArrivalAlarmRemoval === pendingRideId) {
    useRideStore.setState({ pendingArrivalAlarmRemoval: undefined })
  }
}

/** Hands the alarm to the server, which pushes a new time whenever the delay changes, and applies the time it answers with. */
export async function syncArrivalAlarmWithServer() {
  const { id: rideId, route, arrivalAlarm: alarm } = useRideStore.getState()
  if (!rideId || !route || !alarm || alarm.rideId !== rideId || alarm.fireDate <= Date.now()) return

  let token: string
  try {
    token = String((await Notifications.getDevicePushTokenAsync()).data)
  } catch {
    return
  }

  const fireDate = await rideApi.setRideAlarm(rideId, { token, alarmId: alarm.alarmId, leadMinutes: alarm.leadMinutes })
  if (fireDate === undefined) return

  // The rider changed or turned off the alarm while the request was in flight.
  const current = useRideStore.getState().arrivalAlarm
  if (current?.alarmId !== alarm.alarmId || current.leadMinutes !== alarm.leadMinutes) return
  if (Math.abs(fireDate - current.fireDate) < MIN_ALARM_MOVE_MS) return

  // It may have rung while the request was in flight, and rescheduling would ring it again.
  const native = await getArrivalAlarm()
  if (!native?.isScheduled || native.alarmId !== current.alarmId) return

  try {
    const scheduled = await schedule({ ...current, fireDate }, route)
    useRideStore.setState({ arrivalAlarm: { ...current, fireDate: scheduled } })
    trackEvent("arrival_alarm_rescheduled", { source: "app" })
  } catch {}
}

/** Catches up with what happened to the alarm while the app wasn't running */
async function refreshArrivalAlarm() {
  const { id: rideId, arrivalAlarm: alarm, pendingArrivalAlarmRemoval } = useRideStore.getState()
  if (pendingArrivalAlarmRemoval) {
    retryArrivalAlarmRemoval(pendingArrivalAlarmRemoval, rideId)
  }
  if (!alarm) return

  // The ride ended without the app noticing.
  if (alarm.rideId !== rideId) {
    cancelArrivalAlarm()
    useRideStore.setState({ arrivalAlarm: undefined })
    return
  }

  const native = await getArrivalAlarm()
  if (!native || native.alarmId !== alarm.alarmId) {
    useRideStore.setState({ arrivalAlarm: undefined })
    return
  }

  // A one-shot alarm is gone once it rang.
  if (!native.isScheduled && native.fireDate <= Date.now()) {
    useRideStore.setState({ arrivalAlarm: undefined })
    trackEvent("arrival_alarm_rang", { lead_minutes: alarm.leadMinutes })
    return
  }

  if (native.fireDate !== alarm.fireDate) {
    useRideStore.setState({ arrivalAlarm: { ...alarm, fireDate: native.fireDate } })
    trackEvent("arrival_alarm_rescheduled", { source: "extension" })
  }

  // Covers any push the extension missed.
  syncArrivalAlarmWithServer()
}

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined

/** Dev builds only: rings a sample alarm, to see and hear it without a ride. Replaces any ride alarm. */
export async function scheduleTestArrivalAlarm(seconds: number) {
  let authorization = await arrivalAlarmAuthorization()
  if (authorization === "notDetermined") {
    authorization = await requestArrivalAlarmAuthorization()
  }
  if (authorization !== "authorized") return

  await scheduleArrivalAlarm({
    rideId: "dev-test",
    alarmId: createAlarmId(),
    fireDate: Date.now() + seconds * 1000,
    title: translate("ride.alarmTitle", { station: getStationById("4600")?.name ?? "" }),
    stopText: translate("ride.alarmStop"),
  })
}

export function initializeArrivalAlarm() {
  if (!isArrivalAlarmSupported()) return

  refreshArrivalAlarm()
  appStateSubscription?.remove()
  appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") refreshArrivalAlarm()
  })
}
