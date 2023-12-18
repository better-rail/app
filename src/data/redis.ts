import { createClient } from "redis"
import { RedisClientType } from "@redis/client"
import { compact, isEmpty, mapValues, omit } from "lodash"

import { redisUrl } from "./config"
import { Ride } from "../types/ride"
import { logNames, logger } from "../logs"

let client: RedisClientType

export const connectToRedis = async () => {
  client = createClient({ url: redisUrl })

  client.on("error", (error) => {
    if (!isEmpty(error)) {
      logger.error(logNames.redis.connect.failed, { error })
    }
  })

  await client.connect()
  logger.info(logNames.redis.connect.success)
}

export const addRide = async (ride: Ride): Promise<boolean> => {
  try {
    const promises = Object.entries(omit(ride, "rideId")).map(([key, value]) =>
      client.hSet(getKey(ride.rideId), key, JSON.stringify(value)),
    )
    await Promise.all(promises)

    logger.info(logNames.redis.rides.add.success, { rideId: ride.rideId, token: ride.token })
    return true
  } catch (error) {
    logger.error(logNames.redis.rides.add.failed, { error, rideId: ride.rideId, token: ride.token })
    return false
  }
}

export const updateLastRideNotification = async (rideId: string, notificationId: number) => {
  try {
    const isRideExists = await hasRide(rideId)
    if (!isRideExists) {
      return false
    }

    await client.hSet(getKey(rideId), "lastNotificationId", notificationId)

    if (notificationId !== 0) {
      logger.info(logNames.redis.rides.updateNotificationId.success, { rideId, id: notificationId })
    }

    return true
  } catch (error) {
    logger.error(logNames.redis.rides.updateNotificationId.failed, { error, rideId, id: notificationId })
    return false
  }
}

export const updateRideToken = async (rideId: string, token: string) => {
  try {
    await client.hSet(getKey(rideId), "token", token)

    logger.info(logNames.redis.rides.updateToken.success, { rideId, token })
    return true
  } catch (error) {
    logger.error(logNames.redis.rides.updateToken.failed, { error, rideId, token })
    return false
  }
}

export const getRide = async (rideId: string, shouldLog: boolean = true) => {
  try {
    const result = await client.hGetAll(getKey(rideId))
    const parsed = mapValues(result, (value) => JSON.parse(value))
    const ride = { ...parsed, rideId } as Ride

    if (shouldLog) {
      logger.info(logNames.redis.rides.get.success, { rideId })
    }

    return ride
  } catch (error) {
    if (shouldLog) {
      logger.error(logNames.redis.rides.get.failed, { error, rideId })
    }

    return null
  }
}

export const deleteRide = async (rideId: string) => {
  try {
    const result = await client.del(getKey(rideId))
    const success = Boolean(result)

    if (!success) {
      throw new Error("Redis didn't delete ride")
    }

    logger.info(logNames.redis.rides.delete.success, { rideId })
    return success
  } catch (error) {
    try {
      const isRideExists = await hasRide(rideId)
      if (!isRideExists) {
        return true
      } else {
        logger.error(logNames.redis.rides.delete.failed, { error, rideId })
        return false
      }
    } catch {
      logger.error(logNames.redis.rides.delete.failed, { error, rideId })
      return false
    }
  }
}

export const hasRide = async (rideId: string) => {
  try {
    const result = await client.exists(getKey(rideId))
    return Boolean(result)
  } catch (error) {
    return false
  }
}

export const getAllRides = async (): Promise<Ride[] | null> => {
  try {
    const results = await client.keys("rides:*")
    const rideIds = results.map((result) => result.split(":")[1])
    const promises = rideIds.map((rideId) => getRide(rideId, false))
    const rides = compact(await Promise.all(promises))

    logger.info(logNames.redis.rides.getAll.success)
    return rides
  } catch (error) {
    logger.error(logNames.redis.rides.getAll.failed, { error })
    return null
  }
}

const getKey = (rideId: string) => {
  return "rides:" + rideId
}
