import { ApnsClient, Notification, type NotificationOptions, Priority, PushType } from "apns2"

import { appleKeyId, appleKeyContent, appleTeamId, appleBundleId, appleApnHost } from "../data/config"

let client: ApnsClient

export const connectToApn = () => {
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

/** A plain alert the system shows itself (the station alerts), as opposed to the Live Activity updates above. */
export const sendApnAlert = (deviceToken: string, options: Omit<NotificationOptions, "type" | "topic">) => {
  const notification = new Notification(deviceToken, {
    ...options,
    type: PushType.alert,
    topic: appleBundleId,
  })

  return client.send(notification)
}
