/**
 * store.ts — the station alert subscriptions and what each device was last
 * told, in redis (as the rides are), shared by the web service's request
 * handlers and its watcher.
 *
 * Two hashes, both keyed by the device's push token: `station-alerts:subscriptions`
 * holds what each device asked for, `station-alerts:memory` what it was told per
 * station (see derive.ts AlertMemory). A device that unsubscribes, or whose
 * token the push service rejects, loses both.
 */
import { getRedisClient } from "../data/redis"
import { logNames, logger } from "../logs"
import type { StoredSubscription } from "../types/station-alerts"
import type { AlertMemory } from "./derive"

export const SUBSCRIPTIONS_KEY = "station-alerts:subscriptions"
export const MEMORY_KEY = "station-alerts:memory"

/** Per station of a subscription. */
export type SubscriptionMemory = Record<string, AlertMemory>

const client = () => {
  const redis = getRedisClient()
  if (!redis) throw new Error("Redis is not connected")
  return redis
}

export const readSubscriptions = async (): Promise<StoredSubscription[]> => {
  const raw = await client().hGetAll(SUBSCRIPTIONS_KEY)
  const subscriptions: StoredSubscription[] = []
  for (const [token, value] of Object.entries(raw)) {
    try {
      subscriptions.push(JSON.parse(value) as StoredSubscription)
    } catch (error) {
      logger?.warn(logNames.stationAlerts.corruptSubscription, { token, error })
    }
  }
  return subscriptions
}

export const writeSubscription = async (subscription: StoredSubscription): Promise<void> => {
  await client().hSet(SUBSCRIPTIONS_KEY, subscription.token, JSON.stringify(subscription))
}

/** Forget the device: its subscription and what it was told. */
export const removeSubscription = async (token: string): Promise<void> => {
  await Promise.all([client().hDel(SUBSCRIPTIONS_KEY, token), client().hDel(MEMORY_KEY, token)])
}

export const readMemories = async (): Promise<Map<string, SubscriptionMemory>> => {
  const raw = await client().hGetAll(MEMORY_KEY)
  const memories = new Map<string, SubscriptionMemory>()
  for (const [token, value] of Object.entries(raw)) {
    try {
      memories.set(token, JSON.parse(value) as SubscriptionMemory)
    } catch {
      // A memory that cannot be read is as good as none: the next check starts the device afresh.
    }
  }
  return memories
}

export const writeMemory = async (token: string, memory: SubscriptionMemory): Promise<void> => {
  await client().hSet(MEMORY_KEY, token, JSON.stringify(memory))
}
