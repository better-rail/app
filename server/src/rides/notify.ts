import dayjs from "dayjs"
import { Priority } from "apns2"
import { Logger } from "winston"

import { logNames } from "../logs"
import { sendApnNotification } from "../utils/apn-utils"
import { NotificationPayload, Status } from "../types/notification"

export const sendNotification = (payload: NotificationPayload, logger: Logger) => {
  const notifiers = {
    ios: sendAppleNotification,
    default: sendLogNotification,
  }

  const notifier = notifiers[payload.provider]
  notifier(payload, logger)
}

const sendLogNotification = (payload: NotificationPayload, logger: Logger) => {
  logger.info(logNames.notifications.log, { payload })
}

const sendAppleNotification = async (payload: NotificationPayload, logger: Logger) => {
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
    logger.info(logNames.notifications.apple.success, { payload })
  } catch (error) {
    logger.error(logNames.notifications.apple.failed, { error, payload })
  }
}
