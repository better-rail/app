import { Ride } from "../types/rides"
import { Scheduler } from "./scheduler"
import { logNames, logger } from "../logs"
import { deleteRide } from "../data/redis"

const schedulers: Record<string, Scheduler> = {}

export const startRideNotifications = async (ride: Ride) => {
  try {
    const scheduler = await Scheduler.create(ride)
    if (!scheduler) {
      throw new Error("Failed to init scheduler")
    }

    if (schedulers[ride.token]) {
      endRideNotifications(ride.token)
    }

    scheduler.start()
    schedulers[ride.token] = scheduler

    logger.success(logNames.scheduler.registerRide.success, { token: ride.token })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.registerRide.failed, { error, token: ride.token })
    return false
  }
}

export const endRideNotifications = async (token: string) => {
  try {
    const scheduler = schedulers[token]

    if (!scheduler) {
      await deleteRide(token)
      throw new Error("Scheduler not found")
    }

    const success = await scheduler.stop()
    delete schedulers[token]

    if (!success) {
      throw new Error("Scheduler didn't stop")
    }

    logger.success(logNames.scheduler.cancelRide.success, { token })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.cancelRide.failed, { error, token })
    return false
  }
}
