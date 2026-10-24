import { AppState, Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { translate } from "@/i18n"
import { RouteItem } from "@/services/api"
import { RideApi } from "@/services/api/ride-api"
import { trackEvent } from "@/services/analytics"
import {
  arrivalAlarmAuthorization,
  canUseFullScreenAlarm,
  cancelArrivalAlarm,
  getArrivalAlarm,
  isArrivalAlarmSupported,
  moveArrivalAlarm,
  requestArrivalAlarmAuthorization,
  scheduleArrivalAlarm,
} from "@/utils/arrival-alarm-native"
import {
  ArrivalAlarmStop,
  getArrivalAlarmFireDate,
  getArrivalAlarmStops,
  toggleArrivalAlarmStop,
} from "@/utils/helpers/arrival-alarm-helpers"
import { getStationById } from "@/data/stations"
import { ArrivalAlarm, useRideStore } from "./ride"

export const ARRIVAL_ALARM_LEAD_MINUTES = [3, 5, 7, 10, 15]

// Smaller moves aren't worth rescheduling.
const MIN_ALARM_MOVE_MS = 60 * 1000

const rideApi = new RideApi()

// Not cryptographically strong, and doesn't need to be: it only tells one alarm from the next.
const createAlarmId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16)
  })

const stopTitle = (route: RouteItem, train: number) => {
  const station = route.trains[train].destinationStationName
  const isTransfer = train < route.trains.length - 1
  return translate(isTransfer ? "ride.alarmTitleTransfer" : "ride.alarmTitle", { station }) ?? ""
}

/** Schedules the alarm's stops and returns them with when each will ring */
const schedule = async (alarm: ArrivalAlarm, route: RouteItem): Promise<ArrivalAlarmStop[]> => {
  const scheduled = await scheduleArrivalAlarm({
    rideId: alarm.rideId,
    alarmId: alarm.alarmId,
    stopText: translate("ride.alarmStop") ?? "",
    stops: alarm.stops.map(({ train, fireDate }) => ({ train, fireDate, title: stopTitle(route, train) })),
  })

  return alarm.stops.map((stop) => ({
    ...stop,
    fireDate: scheduled.find(({ train }) => train === stop.train)?.fireDate ?? stop.fireDate,
  }))
}

export type EnableArrivalAlarmResult =
  | "enabled"
  | "enabledWithoutUpdates"
  | "enabledWithoutFullScreen"
  | "tooLate"
  | "denied"
  | "failed"

/** Rings `leadMinutes` before each of the `chosen` stops, or the ones the rider chose before */
export async function enableArrivalAlarm(leadMinutes: number, chosen?: number[]): Promise<EnableArrivalAlarmResult> {
  const { id: rideId, route, arrivalAlarm: current } = useRideStore.getState()
  if (!rideId || !route) return "failed"

  // Only the device knows which stops rang: a push may have moved one past its time here.
  if (current) await updateFromDevice(current, "extension")
  const { arrivalAlarmStops, arrivalAlarmRangStops } = useRideStore.getState()

  const now = Date.now()
  const stops = getArrivalAlarmStops(route, chosen ?? arrivalAlarmStops, now)
    // A stop that already rang isn't rung again.
    .filter((train) => !arrivalAlarmRangStops.includes(train))
    .map((train) => ({ train, fireDate: getArrivalAlarmFireDate(route, train, leadMinutes) }))
    // A stop too close to ring before still leaves the later ones.
    .filter((stop) => stop.fireDate > now)
  if (stops.length === 0) return "tooLate"

  let authorization = await arrivalAlarmAuthorization()
  if (authorization === "notDetermined") {
    authorization = await requestArrivalAlarmAuthorization()
  }
  if (authorization !== "authorized") return "denied"

  // A new id even when only the lead time or the stops change, so a push for the old setting can't move it.
  const alarm: ArrivalAlarm = { rideId, alarmId: createAlarmId(), leadMinutes, stops }

  try {
    alarm.stops = await schedule(alarm, route)
  } catch {
    return "failed"
  }

  useRideStore.setState({
    arrivalAlarm: alarm,
    arrivalAlarmStops: chosen ?? arrivalAlarmStops,
    pendingArrivalAlarmRemoval: undefined,
  })
  trackEvent("arrival_alarm_enabled", {
    lead_minutes: leadMinutes,
    stop_count: stops.length,
    has_transfer_stop: stops.some(({ train }) => train < route.trains.length - 1),
  })

  if (Platform.OS === "android") {
    // Moves arrive as data messages, which reach the app without the notification permission.
    syncArrivalAlarmWithServer()
    return androidFullScreenResult()
  }

  // The extension can only move the alarm through a notification the rider allows.
  const { granted } = await Notifications.requestPermissionsAsync()
  // Not awaited: the alarm already rings without the server, it just won't follow delays yet.
  syncArrivalAlarmWithServer()

  return granted ? "enabled" : "enabledWithoutUpdates"
}

/** Asks once to let the alarm take over the lock screen; without it, it still rings as a heads-up notification. */
async function androidFullScreenResult(): Promise<EnableArrivalAlarmResult> {
  if (useRideStore.getState().arrivalAlarmFullScreenPrompted || (await canUseFullScreenAlarm())) return "enabled"

  useRideStore.setState({ arrivalAlarmFullScreenPrompted: true })
  return "enabledWithoutFullScreen"
}

/** Checks or unchecks a stop, and moves the alarm to the new stops when it's on */
export async function toggleArrivalAlarmStopChoice(train: number): Promise<EnableArrivalAlarmResult | undefined> {
  const { route, arrivalAlarm, arrivalAlarmStops, arrivalAlarmRangStops } = useRideStore.getState()
  if (!route) return undefined

  const current = getArrivalAlarmStops(route, arrivalAlarmStops)
  const chosen = toggleArrivalAlarmStop(current, train)
  // The alarm keeps at least one stop that can still ring; turning it off is its own button.
  if (!chosen?.some((stop) => !arrivalAlarmRangStops.includes(stop))) return undefined

  // Checking a stop that's too close to ring before leaves the alarm as it is.
  const adding = !current.includes(train)
  if (arrivalAlarm && adding && getArrivalAlarmFireDate(route, train, arrivalAlarm.leadMinutes) <= Date.now()) {
    return "tooLate"
  }

  if (!arrivalAlarm) {
    useRideStore.setState({ arrivalAlarmStops: chosen })
    return undefined
  }

  return enableArrivalAlarm(arrivalAlarm.leadMinutes, chosen)
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

/** Hands the alarm to the server, which pushes new times whenever the delay changes, and applies the times it answers with. */
export async function syncArrivalAlarmWithServer() {
  const { id: rideId, route, arrivalAlarm: alarm, arrivalAlarmRangStops: rang } = useRideStore.getState()
  const pending = alarm?.stops.filter((stop) => !rang.includes(stop.train) && stop.fireDate > Date.now()) ?? []
  if (!rideId || !route || !alarm || alarm.rideId !== rideId || pending.length === 0) return

  let token: string
  try {
    token = String((await Notifications.getDevicePushTokenAsync()).data)
  } catch {
    return
  }

  const stops = await rideApi.setRideAlarm(rideId, {
    token,
    alarmId: alarm.alarmId,
    leadMinutes: alarm.leadMinutes,
    stops: pending.map(({ train }) => train),
  })
  if (!stops) return

  // The rider changed or turned off the alarm while the request was in flight.
  const current = useRideStore.getState().arrivalAlarm
  if (current?.alarmId !== alarm.alarmId) return

  const moved = stops.some(({ train, fireDate }) => {
    const stop = current.stops.find((own) => own.train === train)
    return stop && !rang.includes(train) && Math.abs(fireDate - stop.fireDate) >= MIN_ALARM_MOVE_MS
  })
  if (!moved) return

  // Moved like a push, which leaves the stops that rang while the request was in flight.
  const push = {
    rideId,
    alarmId: current.alarmId,
    stops: stops.map(({ train, fireDate }) => ({ train, fireDate: fireDate / 1000 })),
  }
  if (await moveArrivalAlarm(push).catch(() => false)) {
    await updateFromDevice(current, "app")
  }
}

/**
 * Updates the alarm with what the device has: the stops a push moved, and the ones that rang.
 * False when the device doesn't have the alarm.
 */
async function updateFromDevice(alarm: ArrivalAlarm, movedBy: "app" | "extension") {
  const device = await getArrivalAlarm()
  if (!device || device.alarmId !== alarm.alarmId) return false

  const now = Date.now()
  const rang = [...useRideStore.getState().arrivalAlarmRangStops]
  let moved = false
  const stops = alarm.stops.map((stop) => {
    const native = device.stops.find(({ train }) => train === stop.train)
    if (rang.includes(stop.train) || !native) return stop

    // A one-shot alarm is gone once it rang.
    if (!native.isScheduled && native.fireDate <= now) {
      trackEvent("arrival_alarm_rang", { lead_minutes: alarm.leadMinutes })
      rang.push(stop.train)
      return { ...stop, fireDate: native.fireDate }
    }

    if (native.fireDate === stop.fireDate) return stop
    moved = true
    return { ...stop, fireDate: native.fireDate }
  })

  if (moved) trackEvent("arrival_alarm_rescheduled", { source: movedBy })

  // The rider changed the alarm in the meantime, but what rang still did.
  if (useRideStore.getState().arrivalAlarm?.alarmId !== alarm.alarmId) {
    useRideStore.setState({ arrivalAlarmRangStops: rang })
    return true
  }

  const allRang = stops.every((stop) => rang.includes(stop.train))
  useRideStore.setState({ arrivalAlarm: allRang ? undefined : { ...alarm, stops }, arrivalAlarmRangStops: rang })
  return true
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

  if (!(await updateFromDevice(alarm, "extension"))) {
    useRideStore.setState({ arrivalAlarm: undefined })
    return
  }

  // Covers any push the extension missed.
  syncArrivalAlarmWithServer()
}

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined

/** Dev builds only: rings a sample transfer alarm, then a destination one, without a ride. Replaces any ride alarm. */
export async function scheduleTestArrivalAlarm(seconds: number) {
  let authorization = await arrivalAlarmAuthorization()
  if (authorization === "notDetermined") {
    authorization = await requestArrivalAlarmAuthorization()
  }
  if (authorization !== "authorized") return

  const now = Date.now()
  await scheduleArrivalAlarm({
    rideId: "dev-test",
    alarmId: createAlarmId(),
    stopText: translate("ride.alarmStop") ?? "",
    stops: [
      {
        train: 0,
        fireDate: now + seconds * 1000,
        title: translate("ride.alarmTitleTransfer", { station: getStationById("3700")?.name ?? "" }) ?? "",
      },
      {
        train: 1,
        fireDate: now + seconds * 4000,
        title: translate("ride.alarmTitle", { station: getStationById("4600")?.name ?? "" }) ?? "",
      },
    ],
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
