import axios from "axios"

import { telegramKey, telegramUrl } from "../data/config"
import { NotificationPayload } from "../types/notifications"

export const sendNotification = (payload: NotificationPayload) => {
  sendLogNotification(payload)
  sendTelegramNotification(payload)
}

const sendLogNotification = (payload: NotificationPayload) => {
  console.log(JSON.stringify(payload))
}

const sendTelegramNotification = (payload: NotificationPayload) => {
  axios.post(telegramUrl, {
    apiKey: telegramKey,
    message: JSON.stringify(payload),
  })
}
