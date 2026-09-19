/**
 * store.ts — the Delay Guard subscriptions and what each device was told, in
 * redis, keyed by push token like the station alerts (station-alerts/store.ts).
 */
import { getRedisClient } from "../data/redis"
import { logNames, logger } from "../logs"
import type { StoredGuardSubscription } from "../types/delay-guards"
import type { GuardMemory } from "./derive"

export const SUBSCRIPTIONS_KEY = "delay-guards:subscriptions"
export const MEMORY_KEY = "delay-guards:memory"

/** Per guard key (see types/delay-guards.ts guardKey) of a subscription. */
export type GuardSubscriptionMemory = Record<string, GuardMemory>

const client = () => {
  const redis = getRedisClient()
  if (!redis) throw new Error("Redis is not connected")
  return redis
}

export const readGuardSubscriptions = async (): Promise<StoredGuardSubscription[]> => {
  const raw = await client().hGetAll(SUBSCRIPTIONS_KEY)
  const subscriptions: StoredGuardSubscription[] = []
  for (const [token, value] of Object.entries(raw)) {
    try {
      subscriptions.push(JSON.parse(value) as StoredGuardSubscription)
    } catch (error) {
      logger?.warn(logNames.delayGuards.corruptSubscription, { token, error })
    }
  }
  return subscriptions
}

export const writeGuardSubscription = async (subscription: StoredGuardSubscription): Promise<void> => {
  await client().hSet(SUBSCRIPTIONS_KEY, subscription.token, JSON.stringify(subscription))
}

export const removeGuardSubscription = async (token: string): Promise<void> => {
  await Promise.all([client().hDel(SUBSCRIPTIONS_KEY, token), client().hDel(MEMORY_KEY, token)])
}

export const readGuardMemories = async (): Promise<Map<string, GuardSubscriptionMemory>> => {
  const raw = await client().hGetAll(MEMORY_KEY)
  const memories = new Map<string, GuardSubscriptionMemory>()
  for (const [token, value] of Object.entries(raw)) {
    try {
      memories.set(token, JSON.parse(value) as GuardSubscriptionMemory)
    } catch {
      // Unreadable: the device starts afresh next check.
    }
  }
  return memories
}

export const writeGuardMemory = async (token: string, memory: GuardSubscriptionMemory): Promise<void> => {
  await client().hSet(MEMORY_KEY, token, JSON.stringify(memory))
}
