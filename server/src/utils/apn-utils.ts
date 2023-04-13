import { ApnsClient, Notification, PushType } from "apns2"

import { appleKeyId, appleKeyContent, appleTeamId, appleBundleId, appleApnUrl } from "../data/config"

let client: ApnsClient

export const connectToApn = () => {
  client = new ApnsClient({
    keyId: appleKeyId,
    team: appleTeamId,
    host: appleApnUrl,
    signingKey: appleKeyContent,
  })
}

export const sendApnNotification = (deviceToken: string, aps?: Record<string, unknown>) => {
  const notification = new Notification(deviceToken, {
    aps,
    type: PushType.liveactivity,
    topic: appleBundleId + ".push-type.liveactivity",
  })

  return client.send(notification)
}
