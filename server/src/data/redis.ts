import { createClient } from "redis"
import { RedisClientType } from "@redis/client"
import { compact, forEach, mapValues, omit } from "lodash"

import { redisUrl } from "./config"
import { Ride } from "../types/rides"
import { logNames, logger } from "../logs"

let client: RedisClientType

export const connectToRedis = async () => {
  try {
    client = createClient({ url: redisUrl })
    await client.connect()
    logger.info(logNames.redis.connect.success)
  } catch (error) {
    logger.failed(logNames.redis.connect.failed, { error })
  }
}

export const addRide = async (ride: Ride) => {
  try {
    const promises: any = []
    promises.push(updateLastRideNotification(ride.token, 0))
    forEach(omit(ride, "token"), (value, key) => {
      client.hSet(getKey(ride.token), key, JSON.stringify(value))
    })

    await Promise.all(promises)
    logger.success(logNames.redis.rides.add.success, { token: ride.token })
    return { ...ride, lastNotificationId: 0 }
  } catch (error) {
    logger.failed(logNames.redis.rides.add.failed, { error, token: ride.token })
    return false
  }
}

export const updateLastRideNotification = async (token: string, id: number) => {
  try {
    await client.hSet(getKey(token), "lastNotificationId", id)

    if (id !== 0) {
      logger.success(logNames.redis.rides.updateNotificationId.success, { token, id })
    }

    return true
  } catch (error) {
    logger.failed(logNames.redis.rides.updateNotificationId.success, { error, token, id })
    return false
  }
}

export const getRide = async (token: string) => {
  try {
    const result = await client.hGetAll(getKey(token))
    const parsed = mapValues(result, (value) => JSON.parse(value))
    const ride = { ...parsed, token } as Ride

    logger.success(logNames.redis.rides.get.success, { token })
    return ride
  } catch (error) {
    logger.failed(logNames.redis.rides.get.success, { error, token })
    return null
  }
}

export const deleteRide = async (token: string) => {
  try {
    const result = await client.del(getKey(token))
    const success = Boolean(result)

    if (!success) {
      throw new Error("Redis didn't delete ride")
    }

    logger.success(logNames.redis.rides.delete.success, { token })
    return success
  } catch (error) {
    logger.failed(logNames.redis.rides.delete.success, { error, token })
    return false
  }
}

export const getAllRides = async () => {
  const results = await client.keys("rides:*")
  const tokens = results.map((result) => result.split(":")[1])
  const promises = tokens.map((token) => getRide(token))
  return compact(await Promise.all(promises))
}

const getKey = (token: string) => {
  return "rides:" + token
}
