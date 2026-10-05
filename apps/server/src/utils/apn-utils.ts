import { ApnsClient, Notification, Priority, PushType } from "apns2"

import { appleKeyId, appleKeyContent, appleTeamId, appleBundleId, appleApnHost } from "../data/config"
import { logNames, logger } from "../logs"

let client: ApnsClient

export const isApnConfigured = () => Boolean(appleKeyId && appleTeamId && appleKeyContent)

export const connectToApn = () => {
  // Same as FCM: no APN key locally, and the client signs eagerly on construction.
  if (!isApnConfigured()) {
    logger.warn(logNames.notifications.notConfigured, { service: "apn" })
    return
  }

  client = new ApnsClient({
    keyId: appleKeyId,
    team: appleTeamId,
    host: appleApnHost,
    signingKey: appleKeyContent,
  })
}

export const sendApnNotification = (deviceToken: string, aps: Record<string, unknown>, priority: Priority) => {
  const notification = new Notification(deviceToken, {
    aps,
    priority,
    type: PushType.liveactivity,
    topic: appleBundleId + ".push-type.liveactivity",
  })

  return client.send(notification)
}

/// A visible push to the app's device token. The notification service extension moves the arrival alarm before it's shown.
export const sendApnAlarmNotification = (
  deviceToken: string,
  options: { alert: { title: string; body: string }; data: Record<string, unknown>; collapseId: string },
) => {
  const notification = new Notification(deviceToken, {
    type: PushType.alert,
    topic: appleBundleId,
    priority: Priority.immediate,
    alert: options.alert,
    data: options.data,
    collapseId: options.collapseId,
    threadId: options.collapseId,
    mutableContent: true,
    // Wakes a suspended (not force-quit) app too, in case the extension couldn't move the alarm.
    contentAvailable: true,
    // Lands quietly in Notification Center: no sound, no banner, no screen wake.
    aps: { "interruption-level": "passive" },
  })

  return client.send(notification)
}
