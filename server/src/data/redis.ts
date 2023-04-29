import { v4 as uuid } from "uuid"
import { createClient } from "redis"
import { RedisClientType } from "@redis/client"
import { compact, forEach, mapValues } from "lodash"

import { redisUrl } from "./config"
import { logNames, logger } from "../logs"
import { Ride, RideRequest } from "../types/ride"

let client: RedisClientType

export const connectToRedis = async () => {
  try {
    client = createClient({ url: redisUrl })
    await client.connect()
    logger.info(logNames.redis.connect.success)
  } catch (error) {
    logger.error(logNames.redis.connect.failed, { error })
  }
}

export const addRide = async (ride: RideRequest): Promise<Ride | false> => {
  const rideId = uuid()

  try {
    const promises: any = []
    promises.push(updateLastRideNotification(rideId, 0))
    forEach(ride, (value, key) => {
      client.hSet(getKey(rideId), key, JSON.stringify(value))
    })

    await Promise.all(promises)
    logger.info(logNames.redis.rides.add.success, { rideId, token: ride.token })
    return { ...ride, rideId, lastNotificationId: 0 }
  } catch (error) {
    logger.error(logNames.redis.rides.add.failed, { error, rideId, token: ride.token })
    return false
  }
}

export const updateLastRideNotification = async (rideId: string, notificationId: number) => {
  try {
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

    logger.info(logNames.redis.rides.updateNotificationId.success, { rideId, token })
    return true
  } catch (error) {
    logger.error(logNames.redis.rides.updateNotificationId.failed, { error, rideId, token })
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
    logger.error(logNames.redis.rides.delete.failed, { error, rideId })
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
