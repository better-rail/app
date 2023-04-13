import dayjs from "dayjs"
import { head, isEmpty, omit } from "lodash"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import { scheduleJob, Job, RecurrenceRule } from "node-schedule"

dayjs.extend(isSameOrBefore)

import { env } from "../data/config"
import { Ride } from "../types/rides"
import { RouteItem } from "../types/rail"
import { logger, logNames } from "../logs"
import { sendNotification } from "./notify"
import { getRouteForRide } from "../requests"
import { endRideNotifications } from "./index"
import { buildNotifications } from "../utils/ride-utils"
import { NotificationPayload } from "../types/notifications"
import { deleteRide, updateLastRideNotification } from "../data/redis"
import { getNotificationToSend, rideUpdateSecond } from "../utils/notify-utils"

export class Scheduler {
  private ride: Ride
  private route: RouteItem
  private updateDelayJob?: Job
  private sendNotificationsJob?: Job
  private lastSentNotification?: NotificationPayload
  private notificationsToSend: NotificationPayload[]

  private constructor(ride: Ride, route: RouteItem) {
    this.ride = ride
    this.route = route
    this.notificationsToSend = this.buildRideNotifications(true)
  }

  static async create(ride: Ride) {
    const route = await getRouteForRide(ride)
    if (!route) {
      return null
    }

    if (env === "production" && Date.now() >= route.arrivalTime) {
      logger.failed(logNames.scheduler.rideInPast, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      deleteRide(ride.token)
      return null
    }

    const instance = new Scheduler(ride, route)
    return instance
  }

  start() {
    if (env === "production") {
      this.startUpdateDelayJob()

      this.sendNotificationsJob = scheduleJob("* * * * *", (fireDate) => {
        const notificationToSendNow = getNotificationToSend(this.notificationsToSend, fireDate)
        if (notificationToSendNow) {
          return this.sendNotification(notificationToSendNow)
        }

        if (this.lastSentNotification) {
          const allNotifications = buildNotifications(this.route, this.ride, false)
          const notificationWithUpdatedDelay = allNotifications.find(
            (notification) => notification.id === this.lastSentNotification?.id,
          )
          this.sendNotification(omit(notificationWithUpdatedDelay || this.lastSentNotification, "alert"))
        }
      })
    } else {
      const rule = new RecurrenceRule()
      rule.second = [0, 15, 30, 45]
      this.sendNotificationsJob = scheduleJob(rule, () => {
        const notificationToSendNow = head(this.notificationsToSend)
        if (notificationToSendNow) {
          this.sendNotification(notificationToSendNow)
        }
      })
    }
  }

  stop() {
    this.stopUpdateDelayJob()
    this.sendNotificationsJob?.cancel()
    this.sendNotificationsJob = undefined
    return deleteRide(this.ride.token)
  }

  private buildRideNotifications(isInitialRun: boolean = false) {
    const notifications = buildNotifications(this.route, this.ride, env === "production", this.lastSentNotification?.id)

    if (env === "production") {
      if (isInitialRun && notifications[0]) {
        this.ride.lastNotificationId = notifications[0].id - 1
        updateLastRideNotification(this.ride.token, this.ride.lastNotificationId)
        if (this.ride.lastNotificationId > 0) {
          const allNotifications = buildNotifications(this.route, this.ride, false)
          const notification = allNotifications.find((notification) => notification.id === this.ride.lastNotificationId)
          if (notification) {
            this.lastSentNotification = notification
          }
        }
      }

      return notifications
    } else {
      // Test ride, send notifications every 15 seconds
      let lastDate = dayjs()
      return notifications.map((notification) => {
        lastDate = lastDate.add(15, "seconds")

        return {
          ...notification,
          time: lastDate,
          state: {
            ...notification.state,
            delay: 0,
          },
        }
      })
    }
  }

  private startUpdateDelayJob() {
    const second = rideUpdateSecond(this.ride.token)

    const rule = new RecurrenceRule()
    rule.second = second

    logger.info(logNames.scheduler.updateDelay.register, { token: this.ride.token, second })
    this.updateDelayJob = scheduleJob(rule, async () => {
      if (isEmpty(this.notificationsToSend)) {
        return this.stopUpdateDelayJob()
      }

      const newRoute = await getRouteForRide(this.ride)
      if (!newRoute) return

      this.route = newRoute
      this.notificationsToSend = this.buildRideNotifications()
      logger.info(logNames.scheduler.updateDelay.updated, {
        token: this.ride.token,
        delay: this.notificationsToSend[0].state.delay,
      })
    })
  }

  private stopUpdateDelayJob() {
    this.updateDelayJob?.cancel()
    this.updateDelayJob = undefined
    logger.info(logNames.scheduler.updateDelay.cancel, { token: this.ride.token })
  }

  private sendNotification(notification: NotificationPayload) {
    if (!this.lastSentNotification || notification.id >= this.lastSentNotification?.id) {
      sendNotification(notification)

      const indexToRemove = this.notificationsToSend.indexOf(notification)
      this.notificationsToSend.splice(indexToRemove, 1)
      if (isEmpty(this.notificationsToSend)) {
        endRideNotifications(this.ride.token)
      } else {
        this.lastSentNotification = notification
        this.ride.lastNotificationId = notification.id
        updateLastRideNotification(this.ride.token, notification.id)
      }
    }
  }
}
