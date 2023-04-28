import { ApnsClient, Notification, Priority, PushType } from "apns2"

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
