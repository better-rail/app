import { Ride } from "../types/ride"
import { Scheduler } from "./scheduler"
import { deleteRide } from "../data/redis"
import { logNames, logger } from "../logs"
import { RideNotInTimeError, rideFailureReason } from "../utils/errors"

const schedulers: Record<string, Scheduler> = {}

export const startRideNotifications = async (ride: Ride, isExisting: boolean = false) => {
  const rideLogger = logger.child({ rideId: ride.rideId, token: ride.token })
  const registerRideLog = isExisting ? logNames.scheduler.rescheduleRide : logNames.scheduler.scheduleRide

  try {
    const scheduler = await Scheduler.create(ride, isExisting, rideLogger)
    if (!scheduler) {
      throw new Error("Failed to init scheduler with unknown error")
    }

    if (schedulers[ride.rideId]) {
      endRideNotifications(ride.rideId)
    }

    scheduler.start()
    schedulers[ride.rideId] = scheduler

    rideLogger.info(registerRideLog.success, { ...ride })
    return { success: true, rideId: ride.rideId }
  } catch (error) {
    const reason = rideFailureReason(error)

    // Warn, not error: the ride is outside the startable window, which isn't a server fault — but still log it.
    if (error instanceof RideNotInTimeError) {
      rideLogger.warn(registerRideLog.failed, { reason, ...ride })
    } else {
      rideLogger.error(registerRideLog.failed, { error, reason, ...ride })
    }

    return { success: false, reason }
  }
}

export const updateRideToken = async (rideId: string, token: string) => {
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
    logger.error(logNames.scheduler.updateRideToken.failed, { error, rideId, token })
    return false
  }
}

export const endRideNotifications = async (rideId: string) => {
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
    logger.error(logNames.scheduler.cancelRide.failed, { error, rideId })
    return false
  }
}
