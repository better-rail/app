import dayjs from "dayjs"
import { Priority } from "apns2"
import { Logger } from "winston"

import { logNames } from "../logs"
import { sendApnNotification } from "../utils/apn-utils"
import { sendFcmNotification } from "../utils/fcm-utils"
import { Message } from "firebase-admin/lib/messaging/messaging-api"
import { NotificationPayload, Provider, Status } from "../types/notification"

type NotifyFunction = (payload: NotificationPayload, logger: Logger) => Promise<boolean>

export const sendNotification = (payload: NotificationPayload, logger: Logger) => {
  const notifiers: Record<Provider, NotifyFunction> = {
    ios: sendAppleNotification,
    android: sendAndroidNotification,
  }

  const notifier = notifiers[payload.provider]
  return notifier(payload, logger)
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
    return true
  } catch (error) {
    logger.error(logNames.notifications.apple.failed, { error, payload })
    return false
  }
}

const sendAndroidNotification = async (payload: NotificationPayload, logger: Logger) => {
  const message: Message = {
    token: payload.token,
    notification: payload.alert && {
      title: payload.alert.title,
      body: payload.alert.text,
    },
    data: {
      status: payload.state.status,
      delay: payload.state.delay.toString(),
      nextStationId: payload.state.nextStationId.toString(),
    },
    android: {
      ttl: 90 * 1000,
      priority: payload.shouldSendImmediately ? "high" : "normal",
    },
  }

  try {
    const messageId = await sendFcmNotification(message)
    logger.info(logNames.notifications.android.success, { payload, messageId })
    return true
  } catch (error) {
    logger.error(logNames.notifications.android.failed, { error, payload })
    return false
  }
}
