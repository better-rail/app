import dayjs from "dayjs"
import { Logger } from "winston"
import { head, isEmpty, omit } from "lodash"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import { scheduleJob, Job, RecurrenceRule } from "node-schedule"

dayjs.extend(isSameOrBefore)

import { logNames } from "../logs"
import { env } from "../data/config"
import { Ride } from "../types/ride"
import { RouteItem } from "../types/rail"
import { sendNotification } from "./notify"
import { getRouteForRide } from "../requests"
import { endRideNotifications } from "./index"
import { NotificationPayload } from "../types/notification"
import { NotFoundRouteForRide, RideNotInTimeError } from "../utils/errors"
import { buildNotifications, getUpdatedLastNotification } from "../utils/ride-utils"
import { addRide, deleteRide, updateLastRideNotification, updateRideToken } from "../data/redis"
import { buildWaitForTrainNotiifcation, getNotificationToSend, rideUpdateSecond } from "../utils/notify-utils"

export class Scheduler {
  logger: Logger
  private ride: Ride
  private route: RouteItem
  private updateDelayJob?: Job
  private sendNotificationsJob?: Job
  private lastSentNotification?: NotificationPayload
  private notificationsToSend: NotificationPayload[]

  private constructor(ride: Ride, route: RouteItem, logger: Logger) {
    this.ride = ride
    this.route = route
    this.logger = logger
    this.notificationsToSend = this.buildRideNotifications(true)
  }

  static async create(ride: Ride, isExisting: boolean, logger: Logger) {
    const route = await getRouteForRide(ride)
    if (!route) {
      if (isExisting) {
        await deleteRide(ride.rideId)
      }

      throw new NotFoundRouteForRide(logNames.routeApi.getRoutes.failed)
    }

    if (env === "production" && dayjs(route.arrivalTime).add(route.delay, "minutes").isBefore(dayjs())) {
      logger.info(logNames.scheduler.rideInPast, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      if (isExisting) {
        await deleteRide(ride.rideId)
      }

      throw new RideNotInTimeError(logNames.scheduler.rideInPast)
    }

    if (env === "production" && dayjs(route.departureTime).add(route.delay, "minutes").diff(dayjs(), "minutes") > 60) {
      logger.info(logNames.scheduler.rideInFuture, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      if (isExisting) {
        await deleteRide(ride.rideId)
      }

      throw new RideNotInTimeError(logNames.scheduler.rideInFuture)
    }

    if (!isExisting) {
      await addRide(ride)
    }

    const instance = new Scheduler(ride, route, logger)
    return instance
  }

  start() {
    if (env === "production") {
      this.startUpdateDelayJob()
      // Send current state immediately to client
      if (this.lastSentNotification && this.lastSentNotification.id > 0) {
        this.sendNotification({ ...this.lastSentNotification, shouldSendImmediately: true })
      }

      // Start notification job
      this.sendNotificationsJob = scheduleJob("* * * * *", (fireDate) => {
        // If there's a new notification to send, send it now
        const notificationToSendNow = getNotificationToSend(this.notificationsToSend, fireDate)
        if (notificationToSendNow) {
          return this.sendNotification(notificationToSendNow)
        }

        // If there isn't new notification to send, update the delay of the current state
        if (this.lastSentNotification && this.lastSentNotification.id > 0) {
          const notificationWithUpdatedDelay = getUpdatedLastNotification(this.route, this.ride, this.lastSentNotification.id)
          return this.sendNotification(
            omit(notificationWithUpdatedDelay || this.lastSentNotification, ["alert", "shouldSendImmediately"]),
          )
        }

        // If the ride didn't depart yet, send wait for train notification
        const waitForTrainNotification = buildWaitForTrainNotiifcation(this.route, this.ride)
        const notificationTime = waitForTrainNotification.time.add(waitForTrainNotification.state.delay, "minutes")
        if (dayjs(fireDate).isSameOrBefore(notificationTime)) {
          return this.sendNotification(waitForTrainNotification)
        }
      })
    } else {
      // Start test ride, update the state every 15 seconds
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

  /**
   * @param isInitialRun Should be true only when called from `this.start()`, used to get the initial
   *                     values for last send notification
   * @returns Filtered notifications to send
   */
  private buildRideNotifications(isInitialRun: boolean = false) {
    const notifications = buildNotifications(this.route, this.ride, env === "production", this.lastSentNotification?.id)

    if (env === "production") {
      // If it's the first run of this function, get the last sent notification
      if (isInitialRun && !isEmpty(notifications)) {
        const lastNotificationId = notifications[0].id - 1
        const notification = getUpdatedLastNotification(this.route, this.ride, lastNotificationId)
        this.updateLastNotification(notification)
      }

      return notifications
    } else {
      // Test ride, build notifications with 15 seconds gap
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

  /**
   * Starts the update delay job, every minute it will update `this.notificationsToSend`
   * with updated delays and remove past notifications
   */
  private startUpdateDelayJob() {
    // Generate a random update second for every ride
    const second = rideUpdateSecond(this.ride.rideId)
    const rule = new RecurrenceRule()
    rule.second = second
    this.logger.info(logNames.scheduler.updateDelay.register, { second })
    this.updateDelayJob = scheduleJob(rule, async () => {
      if (isEmpty(this.notificationsToSend)) {
        return this.stopUpdateDelayJob()
      }

      const newRoute = await getRouteForRide(this.ride)
      if (!newRoute) return

      this.route = newRoute
      this.notificationsToSend = this.buildRideNotifications()

      if (!isEmpty(this.notificationsToSend)) {
        this.logger.info(logNames.scheduler.updateDelay.updated, {
          delay: this.notificationsToSend[0].state.delay,
        })
      }
    })
  }

  private stopUpdateDelayJob() {
    this.updateDelayJob?.cancel()
    this.updateDelayJob = undefined
    this.logger.info(logNames.scheduler.updateDelay.cancel)
  }

  /**
   * - Checks if the notification wasn't sent send
   * - Removes it from `this.notificationsToSend`
   * - Updates last sent notification
   * - Ends the scheduler if the ride has ended
   * @param notification Notification to send
   */
  private async sendNotification(notification: NotificationPayload) {
    if (!this.lastSentNotification || notification.id >= this.lastSentNotification?.id) {
      await sendNotification(notification, this.route, this.logger)

      this.notificationsToSend = this.notificationsToSend.filter((notificationToSend) => notificationToSend.id > notification.id)
      if (isEmpty(this.notificationsToSend)) {
        endRideNotifications(this.ride.rideId)
      } else {
        this.updateLastNotification(notification)
      }
    }
  }

  /**
   * Updates `this.lastSentNotification` and last notification id in redis, used to keep
   * the ride alive on server restarts
   *
   * @param notification Last sent notification
   * @returns `Boolean` success of redis update
   */
  private updateLastNotification(notification?: NotificationPayload) {
    if (notification) {
      this.lastSentNotification = notification
    }

    this.ride.lastNotificationId = notification?.id || 0
    return updateLastRideNotification(this.ride.rideId, this.ride.lastNotificationId)
  }
}
