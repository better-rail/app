import { createClient } from "redis"
import { RedisClientType } from "@redis/client"
import { forEach, mapValues, omit } from "lodash"

import { redisUrl } from "./config"
import { Ride } from "../types/rides"

let client: RedisClientType

export const connectToRedis = async () => {
  client = createClient({ url: redisUrl })
  await client.connect()
  console.log("connected to redis")
}

export const addRide = async (ride: Ride) => {
  try {
    const promises: any = []
    promises.push(updateLastRideNotification(ride.token, 0))
    forEach(omit(ride, "token"), (value, key) => {
      client.hSet(getKey(ride.token), key, JSON.stringify(value))
    })

    await Promise.all(promises)
    return { ...ride, lastNotificationId: 0 }
  } catch {
    return false
  }
}

export const updateLastRideNotification = (token: string, id: number) => {
  return client.hSet(getKey(token), "lastNotificationId", id)
}

export const getRide = async (token: string) => {
  const result = await client.hGetAll(getKey(token))
  const parsed = mapValues(result, (value) => JSON.parse(value))
  return { ...parsed, token } as Ride
}

export const deleteRide = async (token: string) => {
  try {
    const result = await client.del(getKey(token))
    return Boolean(result)
  } catch {
    return false
  }
}

export const getAllRides = async () => {
  const results = await client.keys("rides:*")
  const tokens = results.map((result) => result.split(":")[1])
  const promises = tokens.map((token) => getRide(token))
  return Promise.all(promises)
}

const getKey = (token: string) => {
  return "rides:" + token
}
