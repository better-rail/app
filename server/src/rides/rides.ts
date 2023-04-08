import { keys, last } from "lodash"
import { cancelJob, scheduleJob, scheduledJobs } from "node-schedule"

import { Ride } from "../types/rides"
import { logNames, logger } from "../logs"
import { sendNotification } from "./notify"
import { getRouteForRide } from "../requests"
import { generateJobId } from "../utils/ride-utils"
import { NotificationPayload } from "../types/notifications"
import { deleteRide, updateLastRideNotification } from "../data/redis"
import { buildGetOnTrainNotifications, buildGetOffTrainNotifications, buildNextStationNotifications } from "../utils/notify-utils"

export const startRideNotifications = async (ride: Ride) => {
  try {
    const route = await getRouteForRide(ride)
    if (!route) {
      return false
    }

    if (Date.now() >= route.arrivalTime) {
      logger.failed(logNames.scheduler.rideInPast, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      deleteRide(ride.token)
      return false
    }

    const builtNotifications = [
      ...buildGetOnTrainNotifications(route, ride),
      ...buildNextStationNotifications(route, ride),
      ...buildGetOffTrainNotifications(route, ride),
    ]

    const notifications: NotificationPayload[] = builtNotifications
      .sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1))
      .map((notification, index) => ({
        ...notification,
        id: index + 1,
      }))
      .filter((notification) => notification.id > ride.lastNotificationId)

    notifications.forEach((notification) => {
      scheduleJob(generateJobId(ride), notification.time.toDate(), () => {
        sendNotification(notification)

        if (last(notifications)?.id === notification.id) {
          deleteRide(ride.token)
        } else {
          updateLastRideNotification(ride.token, notification.id)
        }
      })
    })

    logger.success(logNames.scheduler.registerRide.success, { token: ride.token })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.registerRide.failed, { error, token: ride.token })
    return false
  }
}

export const endRideNotifications = (token: string) => {
  try {
    const result = keys(scheduledJobs)
      .filter((job) => job.startsWith(token))
      .map((job) => cancelJob(job))
      .every((value) => value)

    if (!result) {
      throw new Error("Couldn't cancel all jobs")
    }

    logger.success(logNames.scheduler.cancelRide.success, { token })
    return result
  } catch (error) {
    logger.failed(logNames.scheduler.cancelRide.failed, { error, token })
    return false
  }
}
