import { addMinutes, differenceInMinutes } from "date-fns"
import { last } from "lodash"
import type { RideStatus } from "@/hooks/use-ride-progress/use-ride-progress"
import { getStatusEndDate, type RideState, rideProgress } from "@/hooks/use-ride-progress/utils"
import { getInitialLanguage, type LanguageCode, resolveUse12HourClock, type TxKeyPath, translate } from "@/i18n"
import type { RouteItem, Train } from "@/services/api/rail-api.types"
import { formatTime } from "@/utils/helpers/date-helpers"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "@/utils/helpers/ride-helpers"
import { extractFcmData } from "./fcm-payload"
import {
  type AndroidAlert,
  type LiveRideNativeBridge,
  type LiveRideSession,
  type LiveRideUpdatePayload,
  type NotificationPermissionState,
  SemanticColor,
  type SemanticColorType,
} from "./types"

export const STALE_AFTER_MS = 135_000

export type LiveRideStatus = RideStatus | "prepareToExit" | "getOff"

export interface LiveRideState extends Omit<RideState, "status"> {
  status: LiveRideStatus
  rawStatus?: string
}

export interface LiveRideDependencies {
  bridge: LiveRideNativeBridge
  storage: {
    getRoute: () => Promise<RouteItem | null>
    saveRoute: (route: RouteItem) => Promise<void>
    clear: () => Promise<void>
  }
  getNotificationsGranted: () => Promise<boolean>
  requestNotifications?: () => Promise<void>
  getUserLanguage?: () => Promise<string | null>
  now?: () => number
  setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout?: (id: ReturnType<typeof setTimeout>) => void
}

const VALID_STATUSES = new Set<LiveRideStatus>([
  "loading",
  "waitForTrain",
  "inTransit",
  "inExchange",
  "arrived",
  "stale",
  "prepareToExit",
  "getOff",
])

const toRideStatus = (status: string): LiveRideStatus =>
  VALID_STATUSES.has(status as LiveRideStatus) ? (status as LiveRideStatus) : "inTransit"

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

const getTargetDate = (route: RouteItem, state: LiveRideState): Date | null => {
  const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
  if (state.status === "loading") {
    return train ? addMinutes(train.departureTime, state.delay) : null
  }
  return getStatusEndDate(route, state as unknown as RideState) ?? (train ? addMinutes(train.departureTime, state.delay) : null)
}

const getMinutesUntil = (targetDate: Date | null, now: number): number | null =>
  targetDate ? differenceInMinutes(targetDate, now, { roundingMethod: "ceil" }) : null

const isBoarding = (status: LiveRideStatus): boolean =>
  status === "waitForTrain" || status === "inExchange" || status === "loading"

const formatTrainInfo = (train: Train, locale?: string): string =>
  translate("ride.trainInfo", {
    trainNumber: train.trainNumber,
    lastStop: train.lastStop,
    platform: train.originPlatform,
    locale,
  }) ?? ""

export const formatHours = (hours: number, locale?: string): string => {
  const options = locale ? { locale } : undefined
  if (hours === 1) return translate("ride.hoursOne", options) ?? ""
  if (hours === 2) return translate("ride.hoursTwo", options) ?? ""
  return translate("ride.hoursCount", { count: hours, ...options }) ?? ""
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
  if (minutes < 60) return translate(keys.base, { minutes, ...options }) ?? ""
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const hoursText = formatHours(hours, locale)

  if (mins > 0) {
    return translate(keys.hoursAndMinutes, { hours: hoursText, minutes: mins, ...options }) ?? ""
  }
  return translate(keys.hours, { hours: hoursText, ...options }) ?? ""
}

export const formatArrivingIn = (minutes: number, locale?: string): string =>
  formatDuration(DURATION_KEYS.arrivingIn, minutes, locale)

export const formatDepartsIn = (minutes: number, locale?: string): string =>
  formatDuration(DURATION_KEYS.departsIn, minutes, locale)

const getChipText = (state: LiveRideState, minutes: number | null, locale?: string): string => {
  const options = locale ? { locale } : undefined
  const text = (() => {
    if (state.status === "stale") return translate("ride.chipNoSignal", options)
    if (state.status === "arrived") return translate("ride.arrived", options)
    if (minutes !== null && minutes > 0) {
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60)
        const m = minutes % 60
        if (m > 0) {
          return translate("ride.chipInHoursAndMinutes", { hours, minutes: m, ...options })
        }
        return translate("ride.chipInHours", { hours, ...options })
      }
      return translate("ride.chipInMinutes", { minutes, ...options })
    }
    if (minutes !== null && minutes <= 0) return translate("ride.chipNow", options)
    if (state.delay > 0) return translate("ride.chipDelay", { minutes: state.delay, ...options })
    return translate("ride.chipOnTime", options)
  })()
  return text ?? ""
}

interface StationProgress {
  currentIndex: number
  totalStations: number
}

export class LiveRideController {
  private readonly deps: LiveRideDependencies
  private readonly now: () => number
  private readonly setTimeoutFn: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  private readonly clearTimeoutFn: (id: ReturnType<typeof setTimeout>) => void
  private watchdogTimer?: ReturnType<typeof setTimeout>

  constructor(deps: LiveRideDependencies) {
    this.deps = deps
    this.now = deps.now ?? Date.now
    this.setTimeoutFn = deps.setTimeout ?? setTimeout
    this.clearTimeoutFn = deps.clearTimeout ?? clearTimeout
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

  async requestPermissions(): Promise<NotificationPermissionState> {
    if (this.deps.requestNotifications) {
      await this.deps.requestNotifications().catch(() => {})
    }
    return this.checkPermissions()
  }

  async start(route: RouteItem, rideId?: string): Promise<LiveRideSession> {
    const actualRideId = rideId ?? `ride-${this.now()}`
    await this.deps.storage.saveRoute(route)

    const nextStationId = findClosestStationInRoute(route)
    const train = getTrainFromStationId(route, nextStationId)
    const state: LiveRideState = {
      status: getRideStatus(route, train, nextStationId),
      nextStationId,
      delay: train?.delay ?? 0,
    }

    await this.render(route, state)
    this.resetWatchdog(route, state)
    return { rideId: actualRideId, route }
  }

  async processIncomingPush(payload: unknown): Promise<void> {
    const data = extractFcmData(payload)
    if (!data || data.type !== "live-ride") return

    const route = await this.deps.storage.getRoute()
    if (!route) return

    const serverAlertJson = data.alert ?? data.notifee
    let alert: { id?: string; title?: string; body?: string } | undefined
    if (serverAlertJson) {
      try {
        const parsed = typeof serverAlertJson === "string" ? JSON.parse(serverAlertJson) : serverAlertJson
        const title = parsed?.title?.trim()
        const body = (parsed?.body ?? parsed?.text)?.trim()
        const id = parsed?.id
        if (title || body) {
          alert = { id, title, body }
        }
      } catch {}
    }


    const state: LiveRideState = {
      status: toRideStatus(data.status),
      delay: Number(data.delay) || 0,
      nextStationId: Number(data.nextStationId) || 0,
      rawStatus: data.status,
    }

    await this.render(route, state, alert)
    this.resetWatchdog(route, state)
  }

  async stop(): Promise<void> {
    if (this.watchdogTimer) {
      this.clearTimeoutFn(this.watchdogTimer)
      this.watchdogTimer = undefined
    }
    await this.deps.storage.clear()
    await this.deps.bridge.cancelLiveRide().catch(() => false)
  }

  private resetWatchdog(route: RouteItem, state: LiveRideState) {
    if (this.watchdogTimer) {
      this.clearTimeoutFn(this.watchdogTimer)
      this.watchdogTimer = undefined
    }
    if (state.status === "arrived") return

    this.watchdogTimer = this.setTimeoutFn(async () => {
      const currentRoute = await this.deps.storage.getRoute()
      if (!currentRoute) return
      await this.render(currentRoute, {
        status: "stale",
        delay: state.delay,
        nextStationId: last(currentRoute.trains)?.destinationStationId ?? state.nextStationId,
      })
    }, STALE_AFTER_MS)
  }

  private async render(route: RouteItem, state: LiveRideState, alert?: { title?: string; body?: string }) {
    const locale = (await this.deps.getUserLanguage?.()) || getInitialLanguage()

    const [currentIndex, totalStations] = rideProgress(route, state.nextStationId)
    const stations: StationProgress = { currentIndex, totalStations }
    const isArrived = state.status === "arrived"
    const targetDate = getTargetDate(route, state)
    const minutes = getMinutesUntil(targetDate, this.now())
    const defaultTexts = this.getNotificationText(route, state, stations, locale)

    const title = alert?.title || defaultTexts.title
    const body = alert?.body || defaultTexts.body
    const barProgress = this.getBarProgress(route, state, stations)

    const isMilestone = Boolean(
      alert || state.status === "prepareToExit" || state.status === "getOff" || state.status === "arrived",
    )

    const titleSemanticStyle = getLiveRideSemanticStyle(state)

    const payload: LiveRideUpdatePayload = {
      title,
      body,
      ...barProgress,
      isArrived,
      shortCriticalText: getChipText(state, minutes, locale),
      stopActionText: isArrived ? undefined : (translate("ride.stopRide", { locale }) ?? undefined),
      stale: isArrived ? undefined : this.getStaleContent(route, state, barProgress, locale),
      staleAfterMs: STALE_AFTER_MS,
      alertOnce: !isMilestone,
      titleSemanticStyle,
    }

    const success = await this.deps.bridge.updateLiveRide(payload)
    if (!success) {
      throw new Error("Failed to update live ride notification")
    }
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

    const getStationTime = (
      station: { departureTime?: number; arrivalTime?: number } | undefined,
      preferArrival: boolean,
      fallback: number,
    ) => {
      const primary = preferArrival ? station?.arrivalTime : station?.departureTime
      const secondary = preferArrival ? station?.departureTime : station?.arrivalTime
      return (primary || secondary || fallback) + delayMs
    }

    let legStartMs = 0
    let legEndMs = 0

    if (legIndex === 0) {
      legStartMs = trainDep
      legEndMs = getStationTime(stopStations[0], true, trainArr)
    } else if (legIndex < stopStations.length) {
      legStartMs = getStationTime(stopStations[legIndex - 1], false, trainDep)
      legEndMs = getStationTime(stopStations[legIndex], true, trainArr)
    } else {
      legStartMs = getStationTime(stopStations[stopStations.length - 1], false, trainDep)
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

  private getStaleContent(
    route: RouteItem,
    state: LiveRideState,
    barProgress?: { progress: number; maxProgress: number },
    locale?: string,
  ) {
    const arrivalTime = getArrivalTime(route)
    const lastTrain = last(route.trains)
    if (!arrivalTime || !lastTrain) return undefined

    const stale: LiveRideState = { status: "stale", delay: state.delay, nextStationId: lastTrain.destinationStationId }
    const untilMs = addMinutes(arrivalTime, state.delay).getTime()
    const { title, body } = this.getNotificationText(route, stale, undefined, locale)
    return {
      title,
      body,
      untilMs,
      shortCriticalText: getChipText(stale, null, locale),
      stopActionText: translate("ride.stopRide", { locale }) ?? undefined,
      progress: barProgress?.progress,
      maxProgress: barProgress?.maxProgress,
      titleSemanticStyle: state.delay > 0 ? SemanticColor.DANGER : SemanticColor.CAUTION,
    }
  }

  private getNotificationText(
    route: RouteItem,
    state: LiveRideState,
    stations?: StationProgress,
    locale?: string,
  ): { title: string; body: string } {
    const currentIndex = stations?.currentIndex ?? 0
    const totalStations = stations?.totalStations ?? 0
    const targetDate = getTargetDate(route, state)
    const destination = getRideDestination(route)
    const options = locale ? { locale } : undefined
    const activeLocale = (locale || getInitialLanguage()) as LanguageCode

    if (state.status === "stale") {
      const time = targetDate ? formatTime(targetDate, resolveUse12HourClock(activeLocale)) : ""
      const delayText = state.delay > 0 ? ` (${state.delay} ${translate("routes.delayTime", options)})` : ""
      const titlePrefix = targetDate
        ? (translate("ride.arrivingAt", { time, ...options }) ?? "")
        : (translate("plan.rideTo", { destination, ...options }) ?? "")
      return {
        title: `${titlePrefix}${delayText}`,
        body: `${translate("plan.rideTo", { destination, ...options }) ?? ""} | ${translate("ride.connectionIssues", options) ?? ""}`,
      }
    }

    if (state.status === "arrived") {
      return {
        title: translate("ride.arrived", options) ?? "",
        body: translate("ride.greeting", options) ?? "",
      }
    }

    if (isBoarding(state.status)) {
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      const body = train ? formatTrainInfo(train, locale) : (translate("ride.activatingRide", options) ?? "")
      if (!targetDate) return { title: translate("plan.rideTo", { destination, ...options }) ?? "", body }

      const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
      const time = formatTime(targetDate, resolveUse12HourClock(activeLocale))
      const timeText = `(${time})`
      const title =
        minutes < 2 ? `${translate("ride.departsNow", options) ?? ""} ${timeText}` : `${formatDepartsIn(minutes, locale)} ${timeText}`
      return { title, body }
    }

    if (!targetDate) {
      return {
        title: translate("plan.rideTo", { destination, ...options }) ?? "",
        body: translate("plan.rideTo", { destination, ...options }) ?? "",
      }
    }
    const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
    const time = formatTime(targetDate, resolveUse12HourClock(activeLocale))
    const timeText = `(${time})`
    const title = `${formatArrivingIn(minutes, locale)} ${timeText}`

    const stopsLeft = totalStations - currentIndex
    let body: string
    if (state.status === "getOff" || state.rawStatus === "getOff") {
      body = translate("ride.getOff", options) ?? ""
    } else if (stopsLeft <= 0) {
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      body = train ? formatTrainInfo(train, locale) : (translate("plan.rideTo", { destination, ...options }) ?? "")
    } else if (stopsLeft === 1) {
      body = translate("ride.getOffNextStop", options) ?? ""
    } else {
      body = translate("ride.getOffInStops", { stopsLeft, ...options }) ?? ""
    }

    return { title, body }
  }
}
