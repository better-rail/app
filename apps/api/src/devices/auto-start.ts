/**
 * auto-start.ts — starting a recurring ride on the rider's device without them opening the app.
 *
 * iOS (17.2+): an ActivityKit push-to-start notification creates the ride's Live Activity. iOS then wakes the app,
 * which hands the activity's update token to the server (`POST /ride`) as for a ride started in the app.
 * Android: a data message wakes the app, which looks the route up and starts the live ride notification itself.
 *
 * When the device can't be started (no token for it, a route too big for a push) the caller falls back to the
 * reminder notification. Nothing here logs a push token or the device id.
 */
import { stationsObject } from "../data/stations"
import { LanguageCode, railApiLocales, translate } from "../locales/i18n"
import { logNames, logger } from "../logs"
import { sendApnNotification } from "../push/apns"
import { sendFcmNotification } from "../push/fcm"
import { searchTravels } from "../requests/route-api"
import type { RailApiRouteItem } from "../types/rail-response"
import type { DeviceRecord, RecurringRide } from "../types/device"
import { israelEpoch } from "../utils/israel-time"
import type { ReminderResult } from "./reminders"

/** APNs rejects a larger payload. */
const MAX_APN_PAYLOAD_BYTES = 4096
// The timetable can shift a train by a few minutes from the time the rider saved.
const DEPARTURE_TOLERANCE_MS = 5 * 60 * 1000
// Seconds between 1970 and 2001-01-01, where Swift's default Codable counts a Date from.
const SWIFT_EPOCH_OFFSET_S = 978_307_200
// How long a started activity may sit without updates before iOS marks it stale.
const STALE_AFTER_S = 3 * 60 * 60

/** The ride's train today: the one leaving at its departure time from its origin to its destination. */
export const findTravel = (travels: RailApiRouteItem[], ride: RecurringRide, departureAt: number) => {
  const candidates = travels.filter(
    (travel) =>
      travel.trains[0]?.orignStation === ride.originId &&
      travel.trains[travel.trains.length - 1]?.destinationStation === ride.destinationId &&
      Math.abs(israelEpoch(travel.departureTime) - departureAt) <= DEPARTURE_TOLERANCE_MS,
  )
  return candidates.sort(
    (a, b) => Math.abs(israelEpoch(a.departureTime) - departureAt) - Math.abs(israelEpoch(b.departureTime) - departureAt),
  )[0]
}

/** The route as the Live Activity decodes it (`Route` in RouteModel.swift), trimmed like the app trims it. */
export const toActivityRoute = (travel: RailApiRouteItem, viaStationId?: number) => ({
  departureTime: travel.departureTime,
  arrivalTime: travel.arrivalTime,
  trains: travel.trains.map((train) => ({
    trainNumber: train.trainNumber,
    orignStation: train.orignStation,
    destinationStation: train.destinationStation,
    arrivalTime: train.arrivalTime,
    departureTime: train.departureTime,
    stopStations: train.stopStations.map(({ stationId, platform, arrivalTime, departureTime }) => ({
      stationId,
      platform,
      arrivalTime,
      departureTime,
    })),
    routeStations: train.routeStations
      .slice(-1)
      .map(({ stationId, arrivalTime, platform }) => ({ stationId, arrivalTime, platform })),
    originPlatform: train.originPlatform,
    destPlatform: train.destPlatform,
    trainPosition: train.trainPosition ? { calcDiffMinutes: train.trainPosition.calcDiffMinutes ?? null } : null,
  })),
  ...(viaStationId && { viaStationId: String(viaStationId) }),
})

const stationName = (stationId: number, locale: LanguageCode) => {
  const station = stationsObject[stationId]
  if (!station) return ""
  return station[railApiLocales[locale].toLowerCase() as "hebrew" | "english" | "russian" | "arabic"]
}

export const buildAutoStartTexts = (ride: RecurringRide, travel: RailApiRouteItem, locale: LanguageCode) => ({
  title: translate("notifications.autoStart.title", locale, { destination: stationName(ride.destinationId, locale) }),
  body: translate("notifications.autoStart.description", locale, {
    time: travel.departureTime.slice(11, 16),
    platform: travel.trains[0].originPlatform,
  }),
})

/** The push-to-start payload, or undefined when the route doesn't fit in one push. */
export const buildActivityStartPayload = (
  ride: RecurringRide,
  travel: RailApiRouteItem,
  texts: { title: string; body: string },
  now: number,
) => {
  const route = toActivityRoute(travel, ride.viaStationId)
  const nowS = Math.floor(now / 1000)
  const payload = {
    aps: {
      timestamp: nowS,
      event: "start",
      // Ask iOS for the activity's update token, which the app then registers with the server.
      "input-push-token": 1,
      "content-state": {
        delay: travel.trains[0].trainPosition?.calcDiffMinutes ?? 0,
        nextStationId: travel.trains[0].orignStation,
        status: "waitForTrain",
      },
      "attributes-type": "BetterRailActivityAttributes",
      attributes: {
        activityStartDate: now / 1000 - SWIFT_EPOCH_OFFSET_S,
        route,
        frequentPushesEnabled: true,
        // Marks the activity as started by the server, so the app picks it up at launch.
        scheduleId: ride.id,
      },
      alert: texts,
      "stale-date": nowS + STALE_AFTER_S,
    },
  }
  return new TextEncoder().encode(JSON.stringify(payload)).length <= MAX_APN_PAYLOAD_BYTES ? payload : undefined
}

/** The Android data message: the app looks the route up itself, since a route can exceed FCM's 4KB too. */
export const buildAndroidStartMessage = (
  token: string,
  ride: RecurringRide,
  travel: RailApiRouteItem,
  texts: { title: string; body: string },
  now: number,
) => {
  const departureAt = israelEpoch(travel.departureTime)
  return {
    token,
    data: {
      type: "auto-start-ride",
      recurringRideId: ride.id,
      originId: String(ride.originId),
      destinationId: String(ride.destinationId),
      ...(ride.viaStationId && { viaStationId: String(ride.viaStationId) }),
      departureAt: String(departureAt),
      trainNumbers: travel.trains.map((train) => train.trainNumber).join(","),
      ...texts,
    },
    android: { priority: "high" as const, collapseKey: `auto-start-${ride.id}`, ttl: Math.max(0, departureAt - now) },
  }
}

export type AutoStartResult = ReminderResult | "no-train" | "unsupported"

/**
 * Start the ride on the device. "unsupported" means the device can't be started this way (the caller sends the
 * reminder instead); "no-train" means no train leaves near the ride's time today (a holiday, say).
 */
export const autoStartRide = async (
  record: Pick<DeviceRecord, "platform" | "locale" | "tokens" | "supportsPushToStart">,
  ride: RecurringRide,
  departureAt: number,
  now = Date.now(),
): Promise<AutoStartResult> => {
  const iosToken = record.platform === "ios" && record.supportsPushToStart ? record.tokens.pushToStart : undefined
  const androidToken = record.platform === "android" ? record.tokens.fcm : undefined
  if (!iosToken && !androidToken) return "unsupported"

  let travel: RailApiRouteItem | undefined
  try {
    const travels = await searchTravels(ride.originId, ride.destinationId, new Date(departureAt), record.locale, {
      viaStation: ride.viaStationId,
    })
    travel = findTravel(travels, ride, departureAt)
  } catch (error) {
    logger.error(logNames.devices.autoStart.failed, { error, platform: record.platform })
    return "failed"
  }
  if (!travel) return "no-train"

  const texts = buildAutoStartTexts(ride, travel, record.locale)
  try {
    if (iosToken) {
      const payload = buildActivityStartPayload(ride, travel, texts, now)
      if (!payload) return "unsupported"
      await sendApnNotification(iosToken, payload.aps, "immediate")
    } else if (androidToken) {
      await sendFcmNotification(buildAndroidStartMessage(androidToken, ride, travel, texts, now))
    }
    logger.info(logNames.devices.autoStart.success, { platform: record.platform })
    return "sent"
  } catch (error) {
    const reason = (error as { reason?: string }).reason
    const code = (error as { code?: string }).code
    if (
      (reason && ["BadDeviceToken", "Unregistered", "ExpiredToken"].includes(reason)) ||
      code === "messaging/registration-token-not-registered"
    ) {
      logger.warn(logNames.devices.reminder.tokenGone, { platform: record.platform })
      return "token-gone"
    }
    logger.error(logNames.devices.autoStart.failed, { error, platform: record.platform })
    return "failed"
  }
}
