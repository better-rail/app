/**
 * subscription-store.ts — push subscriptions and what each device was last told,
 * in redis (as the rides are), for the station alerts and Delay Guard.
 *
 * Two hashes, both keyed by the device's push token: one holds what each device
 * asked for, the other what it was told per item (a station, a guarded train). A
 * device that unsubscribes, or whose token the push service rejects, loses both.
 */
import { getRedisClient } from "../data/redis"
import { logger } from "../logs"

export type SubscriptionStore<S extends { token: string }, M> = {
  readSubscriptions: () => Promise<S[]>
  writeSubscription: (subscription: S) => Promise<void>
  /** Forget the device: its subscription and what it was told. */
  removeSubscription: (token: string) => Promise<void>
  readMemories: () => Promise<Map<string, M>>
  readMemory: (token: string) => Promise<M | undefined>
  writeMemory: (token: string, memory: M) => Promise<void>
}

const client = () => {
  const redis = getRedisClient()
  if (!redis) throw new Error("Redis is not connected")
  return redis
}

/** A memory that cannot be read is as good as none: the next check starts the device afresh. */
const parseMemory = <M>(value: string | undefined): M | undefined => {
  if (value === undefined) return undefined
  try {
    return JSON.parse(value) as M
  } catch {
    return undefined
  }
}

export const createSubscriptionStore = <S extends { token: string }, M>(options: {
  /** The redis hash of the subscriptions, e.g. "station-alerts:subscriptions". */
  subscriptionsKey: string
  /** The redis hash of what each device was told. */
  memoryKey: string
  /** Logged (with the token) for a subscription that cannot be read. */
  corruptSubscriptionLog: string
}): SubscriptionStore<S, M> => {
  const { subscriptionsKey, memoryKey, corruptSubscriptionLog } = options
  return {
    readSubscriptions: async () => {
      const raw = await client().hGetAll(subscriptionsKey)
      const subscriptions: S[] = []
      for (const [token, value] of Object.entries(raw)) {
        try {
          subscriptions.push(JSON.parse(value) as S)
        } catch (error) {
          logger?.warn(corruptSubscriptionLog, { token, error })
        }
      }
      return subscriptions
    },
    writeSubscription: async (subscription) => {
      await client().hSet(subscriptionsKey, subscription.token, JSON.stringify(subscription))
    },
    removeSubscription: async (token) => {
      await Promise.all([client().hDel(subscriptionsKey, token), client().hDel(memoryKey, token)])
    },
    readMemories: async () => {
      const raw = await client().hGetAll(memoryKey)
      const memories = new Map<string, M>()
      for (const [token, value] of Object.entries(raw)) {
        const memory = parseMemory<M>(value)
        if (memory !== undefined) memories.set(token, memory)
      }
      return memories
    },
    readMemory: async (token) => parseMemory<M>((await client().hGet(memoryKey, token)) ?? undefined),
    writeMemory: async (token, memory) => {
      await client().hSet(memoryKey, token, JSON.stringify(memory))
    },
  }
}
