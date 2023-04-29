import dayjs from "dayjs"
import { Priority } from "apns2"
import { Logger } from "winston"

import { logNames } from "../logs"
import { sendApnNotification } from "../utils/apn-utils"
import { sendFcmNotification } from "../utils/fcm-utils"
import { Message } from "firebase-admin/lib/messaging/messaging-api"
import { NotificationPayload, Provider, Status } from "../types/notification"

type NotifyFunction = (payload: NotificationPayload, logger: Logger) => void

export const sendNotification = (payload: NotificationPayload, logger: Logger) => {
  const notifiers: Record<Provider, NotifyFunction> = {
    ios: sendAppleNotification,
    android: sendAndroidNotification,
  }

  const notifier = notifiers[payload.provider]
  notifier(payload, logger)
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

const sendAndroidNotification = async (payload: NotificationPayload, logger: Logger) => {
  if (!payload.alert) {
    return
  }

  const message: Message = {
    token: payload.token,
    notification: {
      title: payload.alert.title,
      body: payload.alert.text,
    },
    android: {
      priority: payload.shouldSendImmediately ? "high" : "normal",
    },
  }

  try {
    const messageId = await sendFcmNotification(message)
    logger.info(logNames.notifications.android.success, { payload, messageId })
  } catch (error) {
    logger.error(logNames.notifications.android.failed, { error, payload })
  }
}
