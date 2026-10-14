import type { RouteItem, Train } from "@/services/api/rail-api.types"
import {
  SemanticColor,
  type LiveRideNativeBridge,
  type LiveRideSession,
  type LiveRideUpdatePayload,
  type NotificationPermissionState,
} from "./types"
import { extractFcmData } from "./fcm-payload"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "@/utils/helpers/ride-helpers"
import { getStatusEndDate, rideProgress, type RideState } from "@/hooks/use-ride-progress/utils"
import type { RideStatus } from "@/hooks/use-ride-progress/use-ride-progress"
import { formatTime } from "@/utils/helpers/date-helpers"
import { getInitialLanguage, resolveUse12HourClock, translate, type LanguageCode, type TxKeyPath } from "@/i18n"
import i18n from "i18n-js"
import { addMinutes, differenceInMinutes } from "date-fns"
import { last } from "lodash"

export const STALE_AFTER_MS = 135_000

export interface LiveRideDependencies {
  bridge: LiveRideNativeBridge
  storage: {
    getRoute: () => Promise<RouteItem | null>
    saveRoute: (route: RouteItem) => Promise<void>
    clear: () => Promise<void>
  }
  getNotificationsGranted: () => Promise<boolean>
  getUserLanguage?: () => Promise<string | null>
  now?: () => number
}

const toRideStatus = (status: string): RideStatus => (status === "getOff" ? "inTransit" : (status as RideStatus))

export const getLiveRideSemanticStyle = (state: LiveRideState): SemanticColorType => {
  if (state.delay > 0) {
    return SemanticColor.DANGER
  }
  if (state.status === "waitForTrain" || state.status === "inExchange") {
    return SemanticColor.CAUTION
  }
  return SemanticColor.SAFE
}

const getRideDestination = (route: RouteItem) => route.trains[route.trains.length - 1].destinationStationName

const getArrivalTime = (route: RouteItem) => route.arrivalTime ?? last(route.trains)?.arrivalTime

const getTargetDate = (route: RouteItem, state: RideState): Date | null => {
  const firstTrain = route.trains[0]
  return getStatusEndDate(route, state) ?? (firstTrain ? addMinutes(firstTrain.departureTime, state.delay) : null)
}

const getMinutesUntil = (targetDate: Date | null, now: number): number | null =>
  targetDate ? differenceInMinutes(targetDate, now, { roundingMethod: "ceil" }) : null

const isBoarding = (status: RideStatus): boolean => status === "waitForTrain" || status === "inExchange" || status === "loading"

const formatTrainInfo = (train: Train) =>
  translate("ride.trainInfo", {
    trainNumber: train.trainNumber,
    lastStop: train.lastStop,
    platform: train.originPlatform,
  })

export const formatHours = (hours: number, locale?: string): string => {
  const options = locale ? { locale } : undefined
  if (hours === 1) return translate("ride.hoursOne", options)
  if (hours === 2) return translate("ride.hoursTwo", options)
  return translate("ride.hoursCount", { count: hours, ...options })
}

interface DurationTranslationKeys {
  base: TxKeyPath
  hours: TxKeyPath
  hoursAndMinutes: TxKeyPath
}

const DURATION_KEYS = {
  arrivingIn: {
    base: "ride.arrivingIn",
    hours: "ride.arrivingInHours",
    hoursAndMinutes: "ride.arrivingInHoursAndMinutes",
  },
  departsIn: {
    base: "ride.departsIn",
    hours: "ride.departsInHours",
    hoursAndMinutes: "ride.departsInHoursAndMinutes",
  },
} as const satisfies Record<string, DurationTranslationKeys>

const formatDuration = (keys: DurationTranslationKeys, minutes: number, locale?: string): string => {
  const options = locale ? { locale } : undefined
  if (minutes < 60) return translate(keys.base, { minutes, ...options })
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const hoursText = formatHours(hours, locale)

  if (mins > 0) {
    return translate(keys.hoursAndMinutes, { hours: hoursText, minutes: mins, ...options })
  }
  return translate(keys.hours, { hours: hoursText, ...options })
}

export const formatArrivingIn = (minutes: number, locale?: string): string =>
  formatDuration(DURATION_KEYS.arrivingIn, minutes, locale)

export const formatDepartsIn = (minutes: number, locale?: string): string =>
  formatDuration(DURATION_KEYS.departsIn, minutes, locale)

const getChipText = (state: RideState, minutes: number | null): string => {
  const text = (() => {
    if (state.status === "stale") return translate("ride.chipNoSignal")
    if (state.status === "arrived") return translate("ride.arrived")
    if (minutes !== null && minutes > 0) {
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60)
        const m = minutes % 60
        if (m > 0) {
          return translate("ride.chipInHoursAndMinutes", { hours, minutes: m })
        }
        return translate("ride.chipInHours", { hours })
      }
      return translate("ride.chipInMinutes", { minutes })
    }
    if (minutes !== null && minutes <= 0) return translate("ride.chipNow")
    if (state.delay > 0) return translate("ride.chipDelay", { minutes: state.delay })
    return translate("ride.chipOnTime")
  })()
  return text ?? ""
}

interface StationProgress {
  currentIndex: number
  totalStations: number
}

interface LiveRideState extends RideState {
  rawStatus?: string
}

export class LiveRideController {
  private readonly deps: LiveRideDependencies
  private readonly now: () => number

  constructor(deps: LiveRideDependencies) {
    this.deps = deps
    this.now = deps.now ?? Date.now
  }

  async postAlert(alert: AndroidAlert): Promise<boolean> {
    return this.deps.bridge.postAlert(alert)
  }

  async checkPermissions(): Promise<NotificationPermissionState> {
    const { bridge } = this.deps
    const [granted, canPromoteOngoing, canScheduleExactAlarms] = await Promise.all([
      this.deps.getNotificationsGranted().catch(() => false),
      bridge.canPostPromoted().catch(() => false),
      bridge.canScheduleExactAlarms().catch(() => false),
    ])
    return { granted, canPromoteOngoing, canScheduleExactAlarms }
  }

  async start(route: RouteItem, rideId: string): Promise<LiveRideSession> {
    await this.deps.storage.saveRoute(route)

    const nextStationId = findClosestStationInRoute(route)
    const train = getTrainFromStationId(route, nextStationId)
    const state: RideState = {
      status: getRideStatus(route, train, nextStationId),
      nextStationId,
      delay: train?.delay ?? 0,
    }

    await this.render(route, state)
    return { rideId, route }
  }

  async processIncomingPush(payload: unknown): Promise<void> {
    const isDirectData =
      typeof payload === "object" &&
      payload !== null &&
      "type" in payload &&
      typeof (payload as Record<string, unknown>).type === "string"
    const data = isDirectData ? (payload as Record<string, string>) : extractFcmData(payload)
    if (!data || data.type !== "live-ride") return

    const route = await this.deps.storage.getRoute()
    if (!route) return

    const serverAlertJson = data.alert ?? data.notifee
    let alert: { title?: string; body?: string } | undefined
    if (serverAlertJson) {
      try {
        const parsed = typeof serverAlertJson === "string" ? JSON.parse(serverAlertJson) : serverAlertJson
        const title = parsed?.title?.trim()
        const body = (parsed?.body ?? parsed?.text)?.trim()
        if (title || body) {
          alert = { title, body }
        }
      } catch {}
    }

    await this.render(
      route,
      {
        status: toRideStatus(data.status),
        delay: Number(data.delay) || 0,
        nextStationId: Number(data.nextStationId) || 0,
        rawStatus: data.status,
      },
      alert,
    )
  }

  async stop(): Promise<void> {
    await this.deps.bridge.cancelLiveRide().catch(() => false)
    await this.deps.storage.clear()
  }

  private async render(route: RouteItem, state: LiveRideState, alert?: { title?: string; body?: string }) {
    i18n.locale = (await this.deps.getUserLanguage?.()) || getInitialLanguage()

    const [currentIndex, totalStations] = rideProgress(route, state.nextStationId)
    const stations: StationProgress = { currentIndex, totalStations }
    const isArrived = state.status === "arrived"
    const targetDate = getTargetDate(route, state)
    const countdownTargetMs = targetDate ? targetDate.getTime() : undefined
    const minutes = getMinutesUntil(targetDate, this.now())
    const defaultTexts = this.getNotificationText(route, state, stations)

    const title = alert?.title || defaultTexts.title
    const body = alert?.body || defaultTexts.body
    const barProgress = this.getBarProgress(route, state, stations)

    const isMilestone = Boolean(
      alert || state.status === "prepareToExit" || state.status === "getOff" || state.status === "arrived",
    )

    const stopsLeft = stations.totalStations - stations.currentIndex
    const isUrgentExit = stopsLeft === 1 || state.status === "prepareToExit" || state.status === "getOff"
    const bodySemanticStyle = isUrgentExit ? SemanticColor.DANGER : undefined
    const titleSemanticStyle = getLiveRideSemanticStyle(state)

    const payload: LiveRideUpdatePayload = {
      title,
      body,
      ...barProgress,
      isArrived,
      shortCriticalText: getChipText(state, minutes),
      countdownTargetMs,
      stopActionText: isArrived ? undefined : translate("ride.stopRide"),
      stale: isArrived ? undefined : this.getStaleContent(route, state, barProgress),
      staleAfterMs: STALE_AFTER_MS,
      alertOnce: !isMilestone,
      titleSemanticStyle,
      bodySemanticStyle,
    }

    await this.deps.bridge.updateLiveRide(payload)
  }

  private getBarProgress(route: RouteItem, state: LiveRideState, stations: StationProgress) {
    const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
    const stopStations = train?.stopStations ?? []
    const numSegments = Math.max(stopStations.length + 1, stations.totalStations > 0 ? stations.totalStations : 1)
    const SEGMENT_SCALE = 100
    const maxProgress = numSegments * SEGMENT_SCALE

    if (state.status === "waitForTrain") {
      return {
        currentStop: 0,
        totalStops: numSegments,
        progress: 0,
        maxProgress,
      }
    }

    if (state.status === "arrived" || state.status === "getOff" || state.rawStatus === "getOff") {
      return {
        currentStop: numSegments,
        totalStops: numSegments,
        progress: maxProgress,
        maxProgress,
      }
    }

    const nextIndex = stopStations.findIndex((s: { stationId: number }) => s.stationId === state.nextStationId)
    const legIndex = nextIndex >= 0 ? nextIndex : numSegments - 1

    const delayMs = (state.delay || 0) * 60 * 1000
    const trainDep = train ? train.departureTime + delayMs : 0
    const trainArr = train ? train.arrivalTime + delayMs : 0

    let legStartMs = 0
    let legEndMs = 0

    if (legIndex === 0) {
      legStartMs = trainDep
      legEndMs = (stopStations[0]?.arrivalTime || stopStations[0]?.departureTime || trainArr) + delayMs
    } else if (legIndex < stopStations.length) {
      legStartMs = (stopStations[legIndex - 1]?.departureTime || stopStations[legIndex - 1]?.arrivalTime || trainDep) + delayMs
      legEndMs = (stopStations[legIndex]?.arrivalTime || stopStations[legIndex]?.departureTime || trainArr) + delayMs
    } else {
      legStartMs =
        (stopStations[stopStations.length - 1]?.departureTime || stopStations[stopStations.length - 1]?.arrivalTime || trainDep) +
        delayMs
      legEndMs = trainArr
    }

    const now = this.now()
    let fraction = 0

    if (legEndMs > legStartMs && Number.isFinite(legEndMs) && Number.isFinite(legStartMs)) {
      fraction = Math.min(Math.max((now - legStartMs) / (legEndMs - legStartMs), 0), 1)
    } else if (trainArr > trainDep && Number.isFinite(trainArr) && Number.isFinite(trainDep)) {
      fraction = Math.min(Math.max((now - trainDep) / (trainArr - trainDep), 0), 1)
    }

    const progress = Math.min(Math.max(Math.round((legIndex + fraction) * SEGMENT_SCALE), 0), maxProgress)
    const effectiveStop =
      stations.currentIndex > 0 ? stations.currentIndex : Math.min(legIndex + (fraction >= 0.5 ? 1 : 0), numSegments)

    return {
      currentStop: effectiveStop,
      totalStops: numSegments,
      progress,
      maxProgress,
    }
  }

  private getStaleContent(route: RouteItem, state: RideState, barProgress?: { progress: number; maxProgress: number }) {
    const arrivalTime = getArrivalTime(route)
    const lastTrain = last(route.trains)
    if (!arrivalTime || !lastTrain) return undefined

    const stale: RideState = { status: "stale", delay: state.delay, nextStationId: lastTrain.destinationStationId }
    const untilMs = addMinutes(arrivalTime, state.delay).getTime()
    const { title, body } = this.getNotificationText(route, stale)
    return {
      title,
      body,
      untilMs,
      shortCriticalText: getChipText(stale, null),
      countdownTargetMs: untilMs,
      stopActionText: translate("ride.stopRide"),
      progress: barProgress?.progress,
      maxProgress: barProgress?.maxProgress,
      titleSemanticStyle: state.delay > 0 ? SemanticColor.DANGER : SemanticColor.CAUTION,
    }
  }

  private getNotificationText(route: RouteItem, state: RideState, stations?: StationProgress): { title: string; body: string } {
    const currentIndex = stations?.currentIndex ?? 0
    const totalStations = stations?.totalStations ?? 0
    const targetDate = getTargetDate(route, state)
    const destination = getRideDestination(route)

    if (state.status === "stale") {
      const time = targetDate ? formatTime(targetDate, resolveUse12HourClock(i18n.locale as LanguageCode)) : ""
      const delayText = state.delay > 0 ? ` (${state.delay} ${translate("routes.delayTime")})` : ""
      const titlePrefix = targetDate ? translate("ride.arrivingAt", { time }) : translate("plan.rideTo", { destination })
      return {
        title: `${titlePrefix}${delayText}`,
        body: `${translate("plan.rideTo", { destination })} | ${translate("ride.connectionIssues")}`,
      }
    }

    if (state.status === "arrived") {
      return {
        title: translate("ride.arrived"),
        body: translate("ride.greeting"),
      }
    }

    if (isBoarding(state.status)) {
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      const body = train ? formatTrainInfo(train) : translate("ride.activatingRide")
      if (!targetDate) return { title: translate("plan.rideTo", { destination }), body }

      const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
      const time = formatTime(targetDate, resolveUse12HourClock(i18n.locale as LanguageCode))
      const timeText = `(${time})`
      const title =
        minutes < 2 ? `${translate("ride.departsNow")} ${timeText}` : `${formatDepartsIn(minutes, i18n.locale)} ${timeText}`
      return { title, body }
    }

    if (!targetDate) {
      return { title: translate("plan.rideTo", { destination }), body: translate("plan.rideTo", { destination }) }
    }
    const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
    const time = formatTime(targetDate, resolveUse12HourClock(i18n.locale as LanguageCode))
    const timeText = `(${time})`
    const title = `${formatArrivingIn(minutes, i18n.locale)} ${timeText}`

    const stopsLeft = totalStations - currentIndex
    let body: string
    if (state.status === "getOff" || (state as LiveRideState).rawStatus === "getOff") {
      body = translate("ride.getOff")
    } else if (stopsLeft <= 0) {
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      body = train ? formatTrainInfo(train) : translate("plan.rideTo", { destination })
    } else if (stopsLeft === 1) {
      body = translate("ride.getOffNextStop")
    } else {
      body = translate("ride.getOffInStops", { stopsLeft })
    }

    return { title, body }
  }
}
