import { addMinutes, differenceInMinutes } from "date-fns"
import { last } from "lodash"
import type { RideStatus } from "@/hooks/use-ride-progress/use-ride-progress"
import { getStatusEndDate, type RideState, rideProgress } from "@/hooks/use-ride-progress/utils"
import { getInitialLanguage, type LanguageCode, resolveUse12HourClock, type TxKeyPath, translate } from "@/i18n"
import type { RouteItem, Train } from "@/services/api/rail-api.types"
import { formatTime } from "@/utils/helpers/date-helpers"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "@/utils/helpers/ride-helpers"
import {
  type LiveRideNativeBridge,
  type LiveRideUpdatePayload,
  type NotificationPermissionState,
  SemanticColor,
  type TextHighlight,
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

/** Delays shorter than this are routine, so they're shown without color */
export const SIGNIFICANT_DELAY_MINUTES = 5

const isSignificantDelay = (delay: number) => delay >= SIGNIFICANT_DELAY_MINUTES

const SEPARATOR = " · "

const joinParts = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(SEPARATOR)

interface NotificationText {
  title: string
  body: string
  highlights: TextHighlight[]
}

/// The route destination, used as a fallback when we can't resolve the ride's current position
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

const SEGMENT_SCALE = 100

interface BarProgress {
  currentStop: number
  totalStops: number
  progress: number
  maxProgress: number
  transferPoints: number[]
}

const stationTime = (station: { departureTime?: number; arrivalTime?: number }, preferArrival: boolean, fallback: number) =>
  (preferArrival ? station.arrivalTime || station.departureTime : station.departureTime || station.arrivalTime) || fallback

/** The train the ride is on, or waiting for. A transfer station ends one train and starts the next. */
const findCurrentTrainIndex = (route: RouteItem, state: LiveRideState): number => {
  const id = state.nextStationId
  const byStop = route.trains.findIndex((train) => train.stopStations?.some((stop) => stop.stationId === id))
  if (byStop >= 0) return byStop

  const byOrigin = route.trains.findIndex((train) => train.originStationId === id)
  const byDestination = route.trains.findIndex((train) => train.destinationStationId === id)
  const preferred = state.status === "inExchange" ? [byOrigin, byDestination] : [byDestination, byOrigin]
  return preferred.find((index) => index >= 0) ?? 0
}

interface StationProgress {
  currentIndex: number
  totalStations: number
}

export class LiveRideController {
  private readonly deps: LiveRideDependencies
  private readonly now: () => number

  constructor(deps: LiveRideDependencies) {
    this.deps = deps
    this.now = deps.now ?? Date.now
  }

  async checkPermissions(): Promise<NotificationPermissionState> {
    const { bridge } = this.deps
    const [granted, canPromoteOngoing, canScheduleExactAlarms] = await Promise.all([
      this.deps.getNotificationsGranted().catch(() => false),
      bridge.canPostPromoted().catch(() => undefined),
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

  async start(route: RouteItem): Promise<void> {
    await this.deps.storage.saveRoute(route)

    const nextStationId = findClosestStationInRoute(route)
    const train = getTrainFromStationId(route, nextStationId)
    const state: LiveRideState = {
      status: getRideStatus(route, train, nextStationId),
      nextStationId,
      delay: train?.delay ?? 0,
    }

    await this.render(route, state)
  }

  async processIncomingPush(data: Record<string, string>): Promise<void> {
    if (data.type !== "live-ride") return

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
  }

  async stop(): Promise<void> {
    await this.deps.storage.clear()
    await this.deps.bridge.cancelLiveRide().catch(() => false)
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
    const barProgress = this.getBarProgress(route, state)

    const payload: LiveRideUpdatePayload = {
      title,
      body,
      ...barProgress,
      isArrived,
      shortCriticalText: getChipText(state, minutes, locale),
      stopActionText: isArrived ? undefined : (translate("ride.stopRide", { locale }) ?? undefined),
      stale: isArrived ? undefined : this.getStaleContent(route, state, barProgress, locale),
      staleAfterMs: STALE_AFTER_MS,
      // The server attaches an alert once per milestone, and re-sends the state every minute without it
      alertOnce: !alert,
      highlights: defaultTexts.highlights,
      delayed: isSignificantDelay(state.delay),
    }

    const success = await this.deps.bridge.updateLiveRide(payload)
    if (!success) {
      throw new Error("Failed to update live ride notification")
    }
  }

  /**
   * One bar for the whole trip: a segment per leg between stops, across every train, with each
   * transfer marked as a point. The tracker only moves while a train does.
   */
  private getBarProgress(route: RouteItem, state: LiveRideState): BarProgress {
    const legCounts = route.trains.map((train) => (train.stopStations?.length ?? 0) + 1)
    const offsets = legCounts.map((_, index) => legCounts.slice(0, index).reduce((sum, count) => sum + count, 0))
    const totalLegs = Math.max(
      legCounts.reduce((sum, count) => sum + count, 0),
      1,
    )
    const maxProgress = totalLegs * SEGMENT_SCALE
    const transferPoints = offsets.slice(1).map((offset) => offset * SEGMENT_SCALE)

    const bar = (progress: number): BarProgress => ({
      currentStop: Math.floor(progress / SEGMENT_SCALE),
      totalStops: totalLegs,
      progress,
      maxProgress,
      transferPoints,
    })

    // The whole plan shows from the start, faded ahead of the tracker
    if (state.status === "waitForTrain") return bar(0)
    if (state.status === "arrived") return bar(maxProgress)

    const trainIndex = findCurrentTrainIndex(route, state)
    // At a transfer the tracker waits at the transfer point, keeping the progress made so far
    if (state.status === "inExchange") return bar(offsets[trainIndex] * SEGMENT_SCALE)
    // The server sends getOff before every train's last stop, including a transfer
    if (state.status === "getOff" || state.rawStatus === "getOff") {
      return bar((offsets[trainIndex] + legCounts[trainIndex]) * SEGMENT_SCALE)
    }

    const train = route.trains[trainIndex]
    const stops = train.stopStations ?? []
    const stopIndex = stops.findIndex((stop) => stop.stationId === state.nextStationId)
    const legIndex = stopIndex >= 0 ? stopIndex : stops.length

    const delayMs = (state.delay || 0) * 60 * 1000
    const legStart =
      (legIndex === 0 ? train.departureTime : stationTime(stops[legIndex - 1], false, train.departureTime)) + delayMs
    const legEnd =
      (legIndex === stops.length ? train.arrivalTime : stationTime(stops[legIndex], true, train.arrivalTime)) + delayMs
    const fraction =
      legEnd > legStart && Number.isFinite(legStart) ? Math.min(Math.max((this.now() - legStart) / (legEnd - legStart), 0), 1) : 0

    const progress = Math.round((offsets[trainIndex] + legIndex + fraction) * SEGMENT_SCALE)
    return bar(Math.min(Math.max(progress, 0), maxProgress))
  }

  private getStaleContent(route: RouteItem, state: LiveRideState, barProgress?: BarProgress, locale?: string) {
    const arrivalTime = getArrivalTime(route)
    const lastTrain = last(route.trains)
    if (!arrivalTime || !lastTrain) return undefined

    const stale: LiveRideState = { status: "stale", delay: state.delay, nextStationId: lastTrain.destinationStationId }
    const untilMs = addMinutes(arrivalTime, state.delay).getTime()
    const { title, body, highlights } = this.getNotificationText(route, stale, undefined, locale)
    return {
      title,
      body,
      untilMs,
      shortCriticalText: getChipText(stale, null, locale),
      stopActionText: translate("ride.stopRide", { locale }) ?? undefined,
      progress: barProgress?.progress,
      maxProgress: barProgress?.maxProgress,
      transferPoints: barProgress?.transferPoints,
      highlights,
      delayed: isSignificantDelay(state.delay),
    }
  }

  private getNotificationText(
    route: RouteItem,
    state: LiveRideState,
    stations?: StationProgress,
    locale?: string,
  ): NotificationText {
    const currentIndex = stations?.currentIndex ?? 0
    const totalStations = stations?.totalStations ?? 0
    const targetDate = getTargetDate(route, state)
    const destination = getRideDestination(route)
    const options = locale ? { locale } : undefined
    const activeLocale = (locale || getInitialLanguage()) as LanguageCode
    const rideTo = translate("plan.rideTo", { destination, ...options }) ?? ""

    // The new time already includes the delay; the fragment says why it moved, in red once it's significant
    const delayText = state.delay > 0 ? `${state.delay} ${translate("routes.delayTime", options) ?? ""}` : undefined
    const highlights: TextHighlight[] =
      delayText && isSignificantDelay(state.delay) ? [{ text: delayText, style: SemanticColor.DANGER }] : []

    if (state.status === "stale") {
      const connectionIssues = translate("ride.connectionIssues", options) ?? ""
      const time = targetDate ? formatTime(targetDate, resolveUse12HourClock(activeLocale)) : ""
      return {
        title: targetDate ? (translate("ride.arrivingAt", { time, ...options }) ?? "") : rideTo,
        body: joinParts(delayText, rideTo, connectionIssues),
        highlights: [...highlights, { text: connectionIssues, style: SemanticColor.CAUTION }],
      }
    }

    if (state.status === "arrived") {
      return {
        title: translate("ride.arrived", options) ?? "",
        body: translate("ride.greeting", options) ?? "",
        highlights: [],
      }
    }

    if (isBoarding(state.status)) {
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      // the status comes from the server while the lookup runs against the locally cached route,
      // so the two can disagree - fall back rather than reading a missing train's details.
      const trainInfo = train ? formatTrainInfo(train, locale) : (translate("ride.activatingRide", options) ?? "")
      const body = joinParts(delayText, trainInfo)
      if (!targetDate) return { title: rideTo, body, highlights }

      const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
      // a background wake never runs setUserLanguage, so resolve the clock style here
      const time = formatTime(targetDate, resolveUse12HourClock(activeLocale))
      const countdown = minutes < 2 ? (translate("ride.departsNow", options) ?? "") : formatDepartsIn(minutes, locale)
      return { title: joinParts(countdown, time), body, highlights }
    }

    // the next station couldn't be matched to a train, so there's no time to show.
    // fall back to the ride destination instead of rendering an invalid date.
    if (!targetDate) {
      return { title: rideTo, body: joinParts(delayText, rideTo), highlights }
    }
    const minutes = getMinutesUntil(targetDate, this.now()) ?? 0
    const time = formatTime(targetDate, resolveUse12HourClock(activeLocale))
    const title = joinParts(formatArrivingIn(minutes, locale), time)

    const stopsLeft = totalStations - currentIndex
    let progressText: string
    if (state.status === "getOff" || state.rawStatus === "getOff") {
      progressText = translate("ride.getOff", options) ?? ""
    } else if (stopsLeft <= 0) {
      // rideProgress reports [0, 0] when the station isn't in the route, which would render
      // "get off in 0 stops" - fall back rather than showing a nonsense count
      const train = getTrainFromStationId(route, state.nextStationId) ?? route.trains[0]
      progressText = train ? formatTrainInfo(train, locale) : rideTo
    } else if (stopsLeft === 1) {
      progressText = translate("ride.getOffNextStop", options) ?? ""
    } else {
      progressText = translate("ride.getOffInStops", { stopsLeft, ...options }) ?? ""
    }

    return { title, body: joinParts(delayText, progressText), highlights }
  }
}
