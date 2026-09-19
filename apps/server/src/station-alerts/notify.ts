/**
 * notify.ts — a station alert to one device.
 *
 * iOS gets an ordinary alert push over APNs (the live rides use the Live
 * Activity push type; this is the plain kind, which the system shows itself).
 * Android gets a data-only FCM message, as the live rides do, that the app
 * turns into a notification with Notifee (apps/mobile/src/utils/notification-helpers.ts).
 * Both carry the station so a tap opens its card.
 */
import { Priority } from "apns2"
import type { FirebaseError } from "firebase-admin"
import type { Message } from "firebase-admin/lib/messaging/messaging-api"

import { logNames, logger } from "../logs"
import type { AlertProvider } from "../types/station-alerts"
import { sendApnAlert } from "../utils/apn-utils"
import { sendFcmNotification } from "../utils/fcm-utils"
import type { AlertMessage } from "./message"

export type SendResult = "sent" | "failed" | "unregistered"

/** Errors that mean the device is gone for good: its subscription should be dropped. */
const UNREGISTERED_FCM_CODES = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"])
const UNREGISTERED_APN_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"])

export const sendStationAlert = async (
  token: string,
  provider: AlertProvider,
  stationId: string,
  message: AlertMessage,
): Promise<SendResult> => {
  if (provider === "ios") {
    try {
      await sendApnAlert(token, {
        alert: { title: message.title, body: message.body },
        sound: "default",
        threadId: `station-${stationId}`,
        collapseId: `station-${stationId}`,
        priority: Priority.immediate,
        data: { type: "station-alert", stationId },
      })
      return "sent"
    } catch (error) {
      const reason = (error as { reason?: string })?.reason
      if (reason && UNREGISTERED_APN_REASONS.has(reason)) return "unregistered"
      logger?.error(logNames.stationAlerts.sendFailed, { provider, stationId, error })
      return "failed"
    }
  }

  const fcm: Message = {
    token,
    data: {
      type: "station-alert",
      stationId,
      notifee: JSON.stringify({ title: message.title, body: message.body }),
    },
    android: { priority: "high", ttl: 60 * 60 * 1000, collapseKey: `station-${stationId}` },
  }
  try {
    await sendFcmNotification(fcm)
    return "sent"
  } catch (error) {
    const code = (error as FirebaseError)?.code
    if (code && UNREGISTERED_FCM_CODES.has(code)) return "unregistered"
    logger?.error(logNames.stationAlerts.sendFailed, { provider, stationId, error })
    return "failed"
  }
}
