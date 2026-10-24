/**
 * rides/index.ts — the ride routes' view of ride tracking: one Durable Object per ride.
 */
import { runtime } from "../runtime"
import { Ride, RideAlarmRequest } from "../types/ride"
import { logNames, logger } from "../logs"
import type { StartRideResult } from "./ride-do"

const rideObject = (rideId: string) => runtime().RIDES.getByName(rideId)

export const startRideNotifications = async (ride: Ride): Promise<StartRideResult> => {
  try {
    return await rideObject(ride.rideId).start(ride)
  } catch (error) {
    logger.error(logNames.scheduler.scheduleRide.failed, { error, reason: "internal_error", ...ride })
    return { success: false, reason: "internal_error" }
  }
}

export const updateRideToken = async (rideId: string, token: string) => {
  try {
    return await rideObject(rideId).updateToken(token)
  } catch (error) {
    logger.error(logNames.scheduler.updateRideToken.failed, { error, rideId, token })
    return false
  }
}

/** Returns when each stop's alarm should ring, or undefined when the ride isn't tracked */
export const setRideAlarm = async (rideId: string, alarm: RideAlarmRequest) => {
  try {
    return await rideObject(rideId).setAlarm(alarm)
  } catch (error) {
    logger.error(logNames.scheduler.setAlarm.failed, { error, rideId })
    return undefined
  }
}

export const removeRideAlarm = async (rideId: string) => {
  try {
    return await rideObject(rideId).removeAlarm()
  } catch (error) {
    logger.error(logNames.scheduler.removeAlarm.failed, { error, rideId })
    return false
  }
}

export const endRideNotifications = async (rideId: string) => {
  try {
    return await rideObject(rideId).end()
  } catch (error) {
    logger.error(logNames.scheduler.cancelRide.failed, { error, rideId })
    return false
  }
}
