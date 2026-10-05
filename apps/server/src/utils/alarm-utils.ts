import { last } from "lodash"

import { RouteItem } from "../types/rail"
import { RideAlarm } from "../types/ride"
import { stationsObject } from "../data/stations"
import { LanguageCode, railApiLocales, translate } from "../locales/i18n"

// Smaller moves aren't worth a notification.
const MIN_ALARM_MOVE_MS = 60 * 1000

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** When the alarm should ring: `leadMinutes` before the ride's actual (delayed) arrival, in ms */
export const getAlarmFireDate = (route: RouteItem, leadMinutes: number) => {
  const lastTrain = last(route.trains)
  const arrivalTime = lastTrain?.arrivalTime ?? route.arrivalTime
  const delay = lastTrain?.delay ?? route.delay
  return arrivalTime + (delay - leadMinutes) * 60 * 1000
}

/** The fire date to move the device's alarm to, or undefined when it should stay put */
export const getAlarmMove = (alarm: RideAlarm, route: RouteItem, now: number) => {
  // It already rang, and moving it would make it ring again.
  if (alarm.fireDate <= now) return undefined

  const fireDate = getAlarmFireDate(route, alarm.leadMinutes)
  if (Math.abs(fireDate - alarm.fireDate) < MIN_ALARM_MOVE_MS) return undefined

  return fireDate
}

const stationName = (stationId: number, locale: LanguageCode) => {
  const station = stationsObject[stationId]
  if (!station) return ""
  return station[railApiLocales[locale].toLowerCase() as "hebrew" | "english" | "russian" | "arabic"]
}

export const buildAlarmMovedTexts = (alarm: RideAlarm, route: RouteItem, fireDate: number) => {
  const destinationId = last(route.trains)?.destinationStationId ?? 0
  const time = clockFormatter.format(fireDate)

  return {
    title: translate("notifications.alarm.moved.title", alarm.locale, { time }),
    body: translate("notifications.alarm.moved.description", alarm.locale, {
      minutes: alarm.leadMinutes,
      station: stationName(destinationId, alarm.locale),
    }),
    // Shown instead when the device couldn't move the alarm.
    failedBody: translate("notifications.alarm.failed", alarm.locale),
  }
}
