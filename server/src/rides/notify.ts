import axios from "axios"
import dayjs from "dayjs"

import { logNames, logger } from "../logs"
import { NotificationPayload, Status } from "../types/notifications"
import { getApnToken, sendApnNotification } from "../utils/apn-utils"
import { appleBundleId, telegramKey, telegramUrl } from "../data/config"

export const sendNotification = (payload: NotificationPayload) => {
  sendLogNotification(payload)
  sendTelegramNotification(payload)
  sendAppleNotification(payload)
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
  const token = getApnToken()

  const headers = {
    authorization: `bearer ${token}`,
    "apns-push-type": "liveactivity",
    "apns-topic": appleBundleId + ".push-type.liveactivity",
  }

  const body = {
    aps: {
      timestamp: dayjs().unix(),
      event: payload.state.status === Status.arrived ? "end" : "update",
      "content-state": payload.state,
      alert: payload.alert && {
        title: payload.alert.title,
        body: payload.alert.text,
      },
    },
  }

  try {
    await sendApnNotification(payload.token, headers, body)
    logger.success(logNames.notifications.apple.success, { token: payload.token, id: payload.id })
  } catch (error) {
    logger.failed(logNames.notifications.apple.failed, { error, token: payload.token, id: payload.id })
  }
}
