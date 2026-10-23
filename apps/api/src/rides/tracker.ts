/**
 * tracker.ts — one ride's notification schedule, driven by ticks.
 *
 * This is the Bun server's `Scheduler` with its two node-schedule jobs folded
 * into one `tick()`: the per-ride Durable Object (ride-do.ts) calls it from its
 * alarm once a minute in production (at the ride's own second, so the planner
 * work is spread across the minute, as before) and every 15 seconds for a test
 * ride. Each tick refreshes the route (delays) and rebuilds the notifications,
 * moves the device's arrival alarm when the delay changed, then sends whatever
 * is due — the exact decisions the two jobs made. Everything the next tick
 * needs survives an eviction through `state()`, which the Durable Object
 * persists after every change.
 */
import dayjs, { Dayjs } from "dayjs"
import { head, isEmpty, omit } from "lodash"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"

dayjs.extend(isSameOrBefore)

import { logNames, Logger } from "../logs"
import { config } from "../config"
import { Ride, RideAlarmRequest } from "../types/ride"
import { RouteItem } from "../types/rail"
import { sendAlarmMovedNotification, sendNotification } from "./notify"
import { getRouteForRide } from "../requests"
import { NotificationPayload } from "../types/notification"
import { NotFoundRouteForRide, RideNotInTimeError } from "../utils/errors"
import { buildNotifications, getUpdatedLastNotification } from "../utils/ride-utils"
import { getAlarmFireDate, getAlarmMove } from "../utils/alarm-utils"
import { buildWaitForTrainNotiifcation, getNotificationToSend, rideUpdateSecond } from "../utils/notify-utils"

const PRODUCTION_TICK_MS = 60_000
const TEST_TICK_MS = 15_000

/** A notification as stored: `time` is a Dayjs in memory and ISO text at rest. */
type StoredNotification = Omit<NotificationPayload, "time"> & { time: string }

export type TrackerState = {
  ride: Ride
  route: RouteItem
  lastSentNotification?: StoredNotification
  delayUpdatesStopped: boolean
}

const store = (notification: NotificationPayload): StoredNotification => ({
  ...notification,
  time: notification.time.toISOString(),
})
const restore = (notification: StoredNotification): NotificationPayload => ({ ...notification, time: dayjs(notification.time) })

export class RideTracker {
  logger: Logger
  ride: Ride
  private route: RouteItem
  private lastSentNotification?: NotificationPayload
  private notificationsToSend: NotificationPayload[]
  // Mirrors the delay updater cancelling itself once nothing is left to send.
  private delayUpdatesStopped: boolean

  private constructor(ride: Ride, route: RouteItem, logger: Logger, previous?: TrackerState) {
    this.ride = ride
    this.route = route
    this.logger = logger
    this.lastSentNotification = previous?.lastSentNotification && restore(previous.lastSentNotification)
    this.delayUpdatesStopped = previous?.delayUpdatesStopped ?? false
    this.notificationsToSend = this.buildRideNotifications(previous === undefined)
  }

  /** A new ride: the route is looked up and the ride has to be startable now (same rules as before). */
  static async create(ride: Ride, logger: Logger) {
    const route = await getRouteForRide(ride)
    if (!route) throw new NotFoundRouteForRide(logNames.routeApi.getRoutes.failed)

    if (config.env === "production" && dayjs(route.arrivalTime).add(route.delay, "minutes").isBefore(dayjs())) {
      logger.info(logNames.scheduler.rideInPast, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      throw new RideNotInTimeError(logNames.scheduler.rideInPast, "ride_in_past")
    }

    if (config.env === "production" && dayjs(route.departureTime).add(route.delay, "minutes").diff(dayjs(), "minutes") > 60) {
      logger.info(logNames.scheduler.rideInFuture, {
        date: ride.departureDate,
        origin: ride.originId,
        destination: ride.destinationId,
        trains: ride.trains,
      })
      throw new RideNotInTimeError(logNames.scheduler.rideInFuture, "ride_in_future")
    }

    return new RideTracker(ride, route, logger)
  }

  /** A ride woken from storage: picks up exactly where the last tick left it. */
  static restore(state: TrackerState, logger: Logger) {
    return new RideTracker(state.ride, state.route, logger, state)
  }

  state(): TrackerState {
    return {
      ride: this.ride,
      route: this.route,
      lastSentNotification: this.lastSentNotification && store(this.lastSentNotification),
      delayUpdatesStopped: this.delayUpdatesStopped,
    }
  }

  /** The tick cadence, and when the next one is due. */
  nextTickAt(now: number): number {
    if (config.env !== "production") return now + TEST_TICK_MS
    // Once a minute at this ride's own second (rideUpdateSecond), so the route
    // refreshes of all rides are spread across the minute.
    const second = rideUpdateSecond(this.ride.rideId)
    const minute = Math.floor(now / PRODUCTION_TICK_MS) * PRODUCTION_TICK_MS
    const candidate = minute + second * 1000
    return candidate > now ? candidate : candidate + PRODUCTION_TICK_MS
  }

  /** What `start()` did right away: tell the client its current state. */
  async startup() {
    if (config.env !== "production") return
    this.logger.info(logNames.scheduler.updateDelay.register, { second: rideUpdateSecond(this.ride.rideId) })
    if (this.lastSentNotification && this.lastSentNotification.id > 0) {
      return this.sendNotification({ ...this.lastSentNotification, shouldSendImmediately: true })
    }
  }

  /**
   * One tick: the delay update (every minute) followed by the notification job
   * (every minute in production, every 15 s for a test ride). Resolves with
   * whether the ride has ended — the last notification went out.
   */
  async tick(fireDate: Date): Promise<{ ended: boolean }> {
    if (config.env !== "production") {
      const notificationToSendNow = head(this.notificationsToSend)
      if (notificationToSendNow) return this.sendNotification(notificationToSendNow)
      return { ended: false }
    }

    await this.updateDelay()

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

    return { ended: false }
  }

  updateRideToken(token: string) {
    this.ride.token = token
    this.notificationsToSend = this.buildRideNotifications()
    return true
  }

  /** Saves the arrival alarm and returns when each stop should ring, or undefined when it couldn't be saved */
  setAlarm(request: RideAlarmRequest) {
    const stops = request.stops
      .filter((train) => this.route.trains[train])
      .map((train) => ({ train, fireDate: getAlarmFireDate(this.route, train, request.leadMinutes) }))
    if (stops.length === 0) return undefined

    this.ride.alarm = { ...request, stops }
    return stops
  }

  removeAlarm() {
    this.ride.alarm = undefined
    return true
  }

  /** Moves the device's arrival alarms when the delay changed. A failed push is retried on the next delay update. */
  private async syncAlarm() {
    const alarm = this.ride.alarm
    if (!alarm) return

    const stops = getAlarmMove(alarm, this.route, Date.now())
    if (!stops) return

    const sent = await sendAlarmMovedNotification(this.ride, alarm, this.route, stops, this.logger)
    // The rider changed or removed the alarm while the push was in flight.
    if (!sent || this.ride.alarm !== alarm) return

    this.ride.alarm = { ...alarm, stops }
  }

  /**
   * @param isInitialRun Should be true only on a fresh ride, used to get the initial
   *                     values for last send notification
   * @returns Filtered notifications to send
   */
  private buildRideNotifications(isInitialRun: boolean = false) {
    const notifications = buildNotifications(this.route, this.ride, config.env === "production", this.lastSentNotification?.id)

    if (config.env === "production") {
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
   * The delay updater: every minute, refresh the route and rebuild
   * `notificationsToSend` with updated delays, removing past notifications.
   */
  private async updateDelay() {
    if (this.delayUpdatesStopped) return
    if (isEmpty(this.notificationsToSend)) {
      this.delayUpdatesStopped = true
      this.logger.info(logNames.scheduler.updateDelay.cancel)
      return
    }

    const newRoute = await getRouteForRide(this.ride)
    if (!newRoute) return

    this.route = newRoute
    this.notificationsToSend = this.buildRideNotifications()
    await this.syncAlarm()

    if (!isEmpty(this.notificationsToSend)) {
      this.logger.info(logNames.scheduler.updateDelay.updated, {
        delay: this.notificationsToSend[0].state.delay,
      })
    }
  }

  /**
   * - Checks if the notification wasn't sent yet
   * - Removes it from `this.notificationsToSend`
   * - Updates last sent notification
   * - Ends the ride if the ride has ended
   */
  private async sendNotification(notification: NotificationPayload): Promise<{ ended: boolean }> {
    if (!this.lastSentNotification || notification.id >= this.lastSentNotification.id) {
      await sendNotification(notification, this.route, this.logger)

      this.notificationsToSend = this.notificationsToSend.filter((notificationToSend) => notificationToSend.id > notification.id)
      if (isEmpty(this.notificationsToSend)) {
        return { ended: true }
      }
      this.updateLastNotification(notification)
    }
    return { ended: false }
  }

  /** Updates `this.lastSentNotification` and the ride's last notification id, which keeps the ride alive across evictions */
  private updateLastNotification(notification?: NotificationPayload) {
    if (notification) {
      this.lastSentNotification = notification
    }

    this.ride.lastNotificationId = notification?.id || 0
  }
}

export type { Dayjs }
