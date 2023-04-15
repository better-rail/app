import axios from "axios"
import dayjs from "dayjs"
import { Priority } from "apns2"

import { logNames, logger } from "../logs"
import { sendApnNotification } from "../utils/apn-utils"
import { telegramKey, telegramUrl } from "../data/config"
import { NotificationPayload, Status } from "../types/notifications"

export const sendNotification = (payload: NotificationPayload) => {
  sendLogNotification(payload)
  sendAppleNotification(payload)

  // TODO: Remove Telegram notifications before merge
  if (payload.token.startsWith("matan")) {
    sendTelegramNotification(payload)
  }
}

const sendLogNotification = (payload: NotificationPayload) => {
  logger.info(logNames.notifications.log, { payload })
}

const sendTelegramNotification = (payload: NotificationPayload) => {
  axios.post(telegramUrl, {
    apiKey: telegramKey,
    message: JSON.stringify(payload),
  })
}

const sendAppleNotification = async (payload: NotificationPayload) => {
  const aps = {
    timestamp: dayjs().unix(),
    event: payload.state.status === Status.arrived ? "end" : "update",
    "content-state": payload.state,
    "dismissal-date": payload.state.status === Status.arrived && dayjs().add(1, "minutes").unix(),
    alert: payload.alert && {
      title: payload.alert.title,
      body: payload.alert.text,
    },
  }

  const priority = payload.shouldSendImmediately ? Priority.immediate : Priority.throttled

  try {
    await sendApnNotification(payload.token, aps, priority)
    logger.success(logNames.notifications.apple.success, { token: payload.token, id: payload.id })
  } catch (error) {
    logger.failed(logNames.notifications.apple.failed, { error, id: payload.id })
  }
}
