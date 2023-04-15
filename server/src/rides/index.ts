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

    if (schedulers[ride.rideId]) {
      endRideNotifications(ride.rideId)
    }

    scheduler.start()
    schedulers[ride.rideId] = scheduler

    logger.success(logNames.scheduler.registerRide.success, { token: ride.token, rideId: ride.rideId })
    return { success: true, rideId: ride.rideId }
  } catch (error) {
    logger.failed(logNames.scheduler.registerRide.failed, { error, token: ride.token, rideId: ride.rideId })
    return { success: false }
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

    logger.success(logNames.scheduler.updateRideToken.success, { rideId })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.updateRideToken.failed, { error, rideId, token })
    return false
  }
}

export const endRideNotifications = async (rideId: string) => {
  try {
    const scheduler = schedulers[rideId]

    if (!scheduler) {
      await deleteRide(rideId)
      throw new Error("Scheduler not found")
    }

    const success = await scheduler.stop()
    delete schedulers[rideId]

    if (!success) {
      throw new Error("Scheduler didn't stop")
    }

    logger.success(logNames.scheduler.cancelRide.success, { rideId })
    return true
  } catch (error) {
    logger.failed(logNames.scheduler.cancelRide.failed, { error, rideId })
    return false
  }
}
