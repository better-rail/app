import { NotificationPayload } from "../types/types"

export const sendNotification = (payload: NotificationPayload) => {
  sendLogNotification(payload)
}

const sendLogNotification = (payload: NotificationPayload) => {
  console.log(JSON.stringify(payload))
}
