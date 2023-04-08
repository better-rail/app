import axios from "axios"
import http2 from "http2"
import dayjs from "dayjs"

import { logNames, logger } from "../logs"
import { getApnToken } from "../utils/notify-utils"
import { http2Request } from "../utils/request-utils"
import { NotificationPayload } from "../types/notifications"
import { appleApnUrl, appleBundleId, telegramKey, telegramUrl } from "../data/config"

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

const apn = http2.connect(appleApnUrl)
const sendAppleNotification = async (payload: NotificationPayload) => {
  const token = getApnToken()
  const path = "/3/device/" + payload.token

  const headers = {
    authorization: `bearer ${token}`,
    "apns-push-type": "liveactivity",
    "apns-topic": appleBundleId + ".push-type.liveactivity",
  }

  const body = {
    aps: {
      timestamp: dayjs().unix(),
      event: payload.state.arrived ? "end" : "update",
      "content-state": payload.state,
      alert: payload.alert && {
        title: payload.alert.title,
        body: payload.alert.text,
      },
    },
  }

  try {
    await http2Request(
      apn,
      {
        path,
        method: "POST",
        scheme: "https",
      },
      headers,
      body,
    )

    logger.success(logNames.notifications.apple.success, { token: payload.token, id: payload.id })
  } catch (error) {
    logger.failed(logNames.notifications.apple.failed, { error, token: payload.token, id: payload.id })
  }
}
