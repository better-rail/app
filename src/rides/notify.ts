import dayjs from "dayjs"
import { Priority } from "apns2"
import { Logger } from "winston"

import { logNames } from "../logs"
import { RouteItem } from "../types/rail"
import { sendApnNotification } from "../utils/apn-utils"
import { sendFcmNotification } from "../utils/fcm-utils"
import { Message } from "firebase-admin/lib/messaging/messaging-api"
import { NotificationPayload, Provider, Status } from "../types/notification"

type NotifyFunction = (payload: NotificationPayload, route: RouteItem, logger: Logger) => Promise<boolean>

export const sendNotification = (payload: NotificationPayload, route: RouteItem, logger: Logger) => {
  const notifiers: Record<Provider, NotifyFunction> = {
    ios: sendAppleNotification,
    android: sendAndroidNotification,
  }

  const notifier = notifiers[payload.provider]
  return notifier(payload, route, logger)
}

const sendAppleNotification = async (payload: NotificationPayload, route: RouteItem, logger: Logger) => {
  const aps = {
    timestamp: dayjs().unix(),
    event: payload.state.status === Status.arrived ? "end" : "update",
    "content-state": payload.state,
    "stale-date": payload.state.status !== Status.arrived && dayjs().add(135, "seconds").unix(),
    "dismissal-date": dayjs(route.arrivalTime)
      .add(payload.state.delay + 3, "minutes")
      .unix(),
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

const sendAndroidNotification = async (payload: NotificationPayload, route: RouteItem, logger: Logger) => {
  const message: Message = {
    token: payload.token,
    data: {
      type: "live-ride",
      status: payload.state.status,
      delay: payload.state.delay.toString(),
      nextStationId: payload.state.nextStationId.toString(),
    },
    android: {
      ttl: 90 * 1000,
      priority: "high",
    },
  }

  if (payload.alert) {
    message.data!.notifee = JSON.stringify({
      title: payload.alert.title,
      body: payload.alert.text,
    })
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
