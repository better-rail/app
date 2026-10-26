/**
 * notify.ts — a station alert to one device.
 *
 * iOS gets an ordinary alert push over APNs (the live rides use the Live
 * Activity push type; this is the plain kind, which the system shows itself).
 * Android gets a data-only FCM message, as the live rides do, that the app
 * turns into a notification with Notifee (apps/mobile/src/utils/notification-helpers.ts).
 * Both carry the station so a tap opens its card.
 */
import { logNames, logger } from "../logs"
import { sendApnAlert } from "../push/apns"
import { type FcmMessage, sendFcmNotification } from "../push/fcm"
import type { AlertProvider } from "../types/station-alerts"
import type { AlertMessage } from "./message"

export type SendResult = "sent" | "failed" | "unregistered"

/** Errors that mean the device is gone for good: its subscription should be dropped. */
const UNREGISTERED_FCM_CODES = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"])
const UNREGISTERED_APN_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"])

/**
 * An alert to one device: the words, plus the data the app reads to open the right screen
 * (`data.type` says which). `collapseId` keeps only the latest of a kind on a phone that was offline.
 */
export const sendAlertPush = async (
  token: string,
  provider: AlertProvider,
  message: AlertMessage,
  data: Record<string, string> & { type: string },
  collapseId: string,
): Promise<SendResult> => {
  if (provider === "ios") {
    try {
      await sendApnAlert(token, { alert: { title: message.title, body: message.body }, collapseId, data })
      return "sent"
    } catch (error) {
      const reason = (error as { reason?: string })?.reason
      if (reason && UNREGISTERED_APN_REASONS.has(reason)) return "unregistered"
      logger.error(logNames.stationAlerts.sendFailed, { provider, type: data.type, error })
      return "failed"
    }
  }

  const fcm: FcmMessage = {
    token,
    data: { ...data, notifee: JSON.stringify({ title: message.title, body: message.body }) },
    android: { priority: "high", ttl: 60 * 60 * 1000, collapseKey: collapseId },
  }
  try {
    await sendFcmNotification(fcm)
    return "sent"
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code && UNREGISTERED_FCM_CODES.has(code)) return "unregistered"
    logger.error(logNames.stationAlerts.sendFailed, { provider, type: data.type, error })
    return "failed"
  }
}

export const sendStationAlert = (token: string, provider: AlertProvider, stationId: string, message: AlertMessage) =>
  sendAlertPush(token, provider, message, { type: "station-alert", stationId }, `station-${stationId}`)
