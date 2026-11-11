/**
 * reminders.ts — the push that reminds a rider of a recurring ride shortly before it leaves.
 *
 * iOS gets a plain alert on the app's APNs token; Android gets a data message with the texts, which the app posts
 * as a local notification. Either way the tap opens the route, from the ride's stations and departure in the payload.
 * Nothing here logs a push token or the device id.
 */
import { stationsObject } from "../data/stations"
import { LanguageCode, railApiLocales, translate } from "../locales/i18n"
import { logNames, logger } from "../logs"
import { sendApnAlert } from "../push/apns"
import { sendFcmNotification } from "../push/fcm"
import type { DeviceRecord, DeviceTokens, RecurringRide } from "../types/device"

/** What a push answer says about the token it went to. */
export type ReminderResult = "sent" | "failed" | "token-gone"

// Apple's answers for a token that will never work again.
const GONE_APN_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"])

const stationName = (stationId: number, locale: LanguageCode) => {
  const station = stationsObject[stationId]
  if (!station) return ""
  return station[railApiLocales[locale].toLowerCase() as "hebrew" | "english" | "russian" | "arabic"]
}

export const buildReminderTexts = (ride: RecurringRide, locale: LanguageCode) => ({
  title: translate("notifications.recurring.title", locale, {
    time: ride.departureTime,
    destination: stationName(ride.destinationId, locale),
  }),
  body: translate("notifications.recurring.description", locale, { origin: stationName(ride.originId, locale) }),
})

/** What the app needs to open the route when the rider taps the reminder. */
const reminderData = (ride: RecurringRide, departureAt: number) => ({
  type: "recurring-ride",
  recurringRideId: ride.id,
  originId: String(ride.originId),
  destinationId: String(ride.destinationId),
  departureAt: String(departureAt),
})

/** Send one reminder to the device's own token for its platform. */
export const sendReminder = async (
  record: Pick<DeviceRecord, "platform" | "locale" | "tokens">,
  ride: RecurringRide,
  departureAt: number,
  now = Date.now(),
): Promise<ReminderResult> => {
  const texts = buildReminderTexts(ride, record.locale)
  const data = reminderData(ride, departureAt)
  const collapseId = `recurring-ride-${ride.id}`

  try {
    if (record.platform === "ios") {
      if (!record.tokens.apns) return "failed"
      await sendApnAlert(record.tokens.apns, { alert: texts, data, collapseId })
    } else {
      if (!record.tokens.fcm) return "failed"
      await sendFcmNotification({
        token: record.tokens.fcm,
        data: { ...data, ...texts },
        // Pointless once the train left.
        android: { priority: "high", collapseKey: collapseId, ttl: Math.max(0, departureAt - now) },
      })
    }
    logger.info(logNames.devices.reminder.success, { platform: record.platform })
    return "sent"
  } catch (error) {
    const reason = (error as { reason?: string }).reason
    const code = (error as { code?: string }).code
    if ((reason && GONE_APN_REASONS.has(reason)) || code === "messaging/registration-token-not-registered") {
      logger.warn(logNames.devices.reminder.tokenGone, { platform: record.platform })
      return "token-gone"
    }
    logger.error(logNames.devices.reminder.failed, { error, platform: record.platform })
    return "failed"
  }
}

/** The tokens without the platform's push token, after APNs or FCM said it's gone. */
export const withoutPushToken = (platform: DeviceRecord["platform"], tokens: DeviceTokens): DeviceTokens => {
  const { apns, fcm, ...rest } = tokens
  return platform === "ios" ? { ...rest, ...(fcm && { fcm }) } : { ...rest, ...(apns && { apns }) }
}
