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
import { deleteRide, updateLastRideNotification, updateRideToken } from "../data/redis"
import { buildWaitForTrainNotiifcation, getNotificationToSend, rideUpdateSecond } from "../utils/notify-utils"

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
      deleteRide(ride.rideId)
      return null
    }

    const instance = new Scheduler(ride, route)
    return instance
  }

  start() {
    if (env === "production") {
      this.startUpdateDelayJob()
      if (this.lastSentNotification && this.lastSentNotification.id > 0) {
        this.sendNotification(this.lastSentNotification)
      }

      this.sendNotificationsJob = scheduleJob("* * * * *", (fireDate) => {
        const notificationToSendNow = getNotificationToSend(this.notificationsToSend, fireDate)
        if (notificationToSendNow) {
          return this.sendNotification(notificationToSendNow)
        }

        if (this.lastSentNotification && this.lastSentNotification.id > 0) {
          const allNotifications = buildNotifications(this.route, this.ride, false)
          const notificationWithUpdatedDelay = allNotifications.find(
            (notification) => notification.id === this.lastSentNotification?.id,
          )
          return this.sendNotification(
            omit(notificationWithUpdatedDelay || this.lastSentNotification, ["alert", "shouldSendImmediately"]),
          )
        }

        const waitForTrainNotification = buildWaitForTrainNotiifcation(this.route, this.ride)
        const notificationTime = waitForTrainNotification.time.add(waitForTrainNotification.state.delay, "minutes")
        if (dayjs(fireDate).isSameOrBefore(notificationTime)) {
          return this.sendNotification(waitForTrainNotification)
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
    return deleteRide(this.ride.rideId)
  }

  async updateRideToken(token: string) {
    const success = await updateRideToken(this.ride.rideId, token)

    if (success) {
      this.ride.token = token
      this.notificationsToSend = this.buildRideNotifications()
    }

    return success
  }

  private buildRideNotifications(isInitialRun: boolean = false) {
    const notifications = buildNotifications(this.route, this.ride, env === "production", this.lastSentNotification?.id)

    if (env === "production") {
      if (isInitialRun && notifications[0]) {
        this.ride.lastNotificationId = notifications[0].id - 1
        updateLastRideNotification(this.ride.rideId, this.ride.lastNotificationId)
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
    const second = rideUpdateSecond(this.ride.rideId)

    const rule = new RecurrenceRule()
    rule.second = second

    logger.info(logNames.scheduler.updateDelay.register, { rideId: this.ride.rideId, second })
    this.updateDelayJob = scheduleJob(rule, async () => {
      if (isEmpty(this.notificationsToSend)) {
        return this.stopUpdateDelayJob()
      }

      const newRoute = await getRouteForRide(this.ride)
      if (!newRoute) return

      this.route = newRoute
      this.notificationsToSend = this.buildRideNotifications()

      if (!isEmpty(this.notificationsToSend)) {
        logger.info(logNames.scheduler.updateDelay.updated, {
          rideId: this.ride.rideId,
          delay: this.notificationsToSend[0].state.delay,
        })
      }
    })
  }

  private stopUpdateDelayJob() {
    this.updateDelayJob?.cancel()
    this.updateDelayJob = undefined
    logger.info(logNames.scheduler.updateDelay.cancel, { rideId: this.ride.rideId })
  }

  private sendNotification(notification: NotificationPayload) {
    if (!this.lastSentNotification || notification.id >= this.lastSentNotification?.id) {
      sendNotification(notification)

      const indexToRemove = this.notificationsToSend.indexOf(notification)
      this.notificationsToSend.splice(indexToRemove, 1)
      if (isEmpty(this.notificationsToSend)) {
        endRideNotifications(this.ride.rideId)
      } else {
        this.lastSentNotification = notification
        this.ride.lastNotificationId = notification.id
        updateLastRideNotification(this.ride.rideId, notification.id)
      }
    }
  }
}
