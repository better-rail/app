import { createClient } from "redis"
import { RedisClientType } from "@redis/client"
import { forEach, mapValues, omit } from "lodash"

import { redisUrl } from "./config"
import { Ride } from "../types/types"

let client: RedisClientType

const connectToRedis = async () => {
  client = createClient({ url: redisUrl })
  await client.connect()
  console.log("connected to redis")
}

const getKey = (token: string) => {
  return "rides:" + token
}

const addRide = async (ride: Ride) => {
  try {
    const promises: any = []
    forEach(omit(ride, "token"), (value, key) => {
      client.hSet(getKey(ride.token), key, JSON.stringify(value))
    })

    await Promise.all(promises)
    return ride
  } catch {
    return false
  }
}

const getRide = async (token: string) => {
  const result = await client.hGetAll(getKey(token))
  const parsed = mapValues(result, (value) => JSON.parse(value))
  return { ...parsed, token } as Ride
}

const deleteRide = async (token: string) => {
  try {
    const result = await client.del(getKey(token))
    return Boolean(result)
  } catch {
    return false
  }
}

export { connectToRedis, addRide, getRide, deleteRide }
