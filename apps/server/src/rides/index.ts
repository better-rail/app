import { randomUUID } from "node:crypto"

import { Ride } from "../types/ride"
import { Scheduler } from "./scheduler"
import { deleteRide } from "../data/redis"
import { logNames, logger } from "../logs"
import { NotFoundRouteForRide, RideNotInTimeError, rideFailureReason } from "../utils/errors"
import { NoActiveFeedError } from "../requests/gtfs-route-api"

const schedulers: Record<string, Scheduler> = {}

export const startRideNotifications = async (ride: Ride, isExisting: boolean = false, requestId: string = randomUUID()) => {
  const rideLogger = logger.child({ requestId })
  const registerRideLog = isExisting ? logNames.scheduler.rescheduleRide : logNames.scheduler.scheduleRide

  try {
    const scheduler = await Scheduler.create(ride, isExisting, rideLogger, requestId)
    if (!scheduler) {
      throw new Error("Failed to init scheduler with unknown error")
    }

    if (schedulers[ride.rideId]) {
      endRideNotifications(ride.rideId, requestId)
    }

    scheduler.start()
    schedulers[ride.rideId] = scheduler

    rideLogger.info(registerRideLog.success, { requestId })
    return { success: true, rideId: ride.rideId }
  } catch (error) {
    const reason = error instanceof NoActiveFeedError ? "timetable_unavailable" : rideFailureReason(error)

    // Warn, not error: a ride outside the startable window isn't a server fault, and a missing
    // route's cause was already logged as an error by getRouteForRide.
    if (error instanceof RideNotInTimeError || error instanceof NotFoundRouteForRide || error instanceof NoActiveFeedError) {
      rideLogger.warn(registerRideLog.failed, { requestId, reason })
    } else {
      rideLogger.error(registerRideLog.failed, {
        requestId,
        reason,
        errorType: error instanceof Error ? error.name : "unknown",
      })
    }

    return { success: false, reason }
  }
}

export const updateRideToken = async (rideId: string, token: string, requestId: string = randomUUID()) => {
  try {
    const scheduler = schedulers[rideId]

    if (!scheduler) {
      await deleteRide(rideId)
      throw new Error("Scheduler not found")
    }

    const success = await scheduler.updateRideToken(token)

    if (!success) {
      throw new Error("Scheduler didn't stop")
    }

    scheduler.logger.info(logNames.scheduler.updateRideToken.success)
    return true
  } catch (error) {
    logger.error(logNames.scheduler.updateRideToken.failed, {
      requestId,
      errorType: error instanceof Error ? error.name : "unknown",
    })
    return false
  }
}

export const endRideNotifications = async (rideId: string, requestId: string = randomUUID()) => {
  try {
    const scheduler = schedulers[rideId]

    if (!scheduler) {
      await deleteRide(rideId)
    } else {
      const success = await scheduler.stop()
      delete schedulers[rideId]

      if (!success) {
        throw new Error("Scheduler didn't stop")
      }

      scheduler.logger.info(logNames.scheduler.cancelRide.success)
    }

    return true
  } catch (error) {
    logger.error(logNames.scheduler.cancelRide.failed, {
      requestId,
      errorType: error instanceof Error ? error.name : "unknown",
    })
    return false
  }
}
