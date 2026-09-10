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
