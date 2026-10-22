import dayjs from "dayjs"

import { logNames, Logger } from "../logs"
import { RouteItem } from "../types/rail"
import { Ride, RideAlarm, RideAlarmStop } from "../types/ride"
import { buildAlarmMovedTexts, buildAndroidAlarmMessage, buildApnAlarmData } from "../utils/alarm-utils"
import { ApnPriority, sendApnAlarmNotification, sendApnNotification } from "../push/apns"
import { FcmMessage, sendFcmNotification } from "../push/fcm"
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

  const priority: ApnPriority = payload.shouldSendImmediately ? "immediate" : "throttled"

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
  const message: FcmMessage = {
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
    // A stable id makes a retried or re-sent alert replace the banner instead of stacking a second one.
    message.data!.notifee = JSON.stringify({
      id: `live-ride-alert-${payload.id}`,
      title: payload.alert.title,
      body: payload.alert.text,
    })
  }

  try {
    const messageId = await sendFcmNotification(message)
    logger.info(logNames.notifications.android.success, { payload, messageId })
    return true
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code !== "messaging/registration-token-not-registered") {
      logger.error(logNames.notifications.android.failed, { error, payload })
    }
    return false
  }
}

export const sendAlarmMovedNotification = async (
  ride: Ride,
  alarm: RideAlarm,
  route: RouteItem,
  stops: RideAlarmStop[],
  logger: Logger,
) => {
  const texts = buildAlarmMovedTexts(alarm, route, stops)
  const { title, body, failedBody } = texts

  try {
    if (ride.provider === Provider.android) {
      await sendFcmNotification(buildAndroidAlarmMessage(ride.rideId, alarm, texts, stops, Date.now()))
    } else {
      await sendApnAlarmNotification(alarm.token, {
        alert: { title, body },
        collapseId: `arrival-alarm-${ride.rideId}`,
        data: buildApnAlarmData(ride.rideId, alarm, stops, failedBody),
      })
    }

    logger.info(logNames.notifications.alarm.success, { stops, provider: ride.provider })
    return true
  } catch (error) {
    logger.error(logNames.notifications.alarm.failed, { error, stops, provider: ride.provider })
    return false
  }
}
