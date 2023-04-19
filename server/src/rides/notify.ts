import dayjs from "dayjs"
import { Priority } from "apns2"

import { logNames, logger } from "../logs"
import { sendApnNotification } from "../utils/apn-utils"
import { NotificationPayload, Status } from "../types/notification"

export const sendNotification = (payload: NotificationPayload) => {
  sendLogNotification(payload)
  sendAppleNotification(payload)
}

const sendLogNotification = (payload: NotificationPayload) => {
  logger.info(logNames.notifications.log, { payload })
}

const sendAppleNotification = async (payload: NotificationPayload) => {
  const aps = {
    timestamp: dayjs().unix(),
    event: payload.state.status === Status.arrived ? "end" : "update",
    "content-state": payload.state,
    "dismissal-date": payload.state.status === Status.arrived && dayjs().add(3, "minutes").unix(),
    alert: payload.alert && {
      title: payload.alert.title,
      body: payload.alert.text,
    },
  }

  const priority = payload.shouldSendImmediately ? Priority.immediate : Priority.throttled

  try {
    await sendApnNotification(payload.token, aps, priority)
    logger.success(logNames.notifications.apple.success, { token: payload.token, notificationId: payload.id })
  } catch (error) {
    logger.failed(logNames.notifications.apple.failed, { error, notificationId: payload.id })
  }
}
