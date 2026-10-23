/**
 * subscription-store.ts — push subscriptions and what each device was last told,
 * in a Durable Object's storage, for the station alerts and Delay Notifications.
 *
 * Two key ranges, both by the device's push token: one holds what each device
 * asked for, the other what it was told per item (a station, a guarded train). A
 * device that unsubscribes, or whose token the push service rejects, loses both.
 * What the redis hashes were on the Bun server; the watcher reads every
 * subscription each cycle, which is one `list` here.
 */

export type SubscriptionStore<S extends { token: string }, M> = {
  readSubscriptions: () => Promise<S[]>
  writeSubscription: (subscription: S) => Promise<void>
  /** Forget the device: its subscription and what it was told. */
  removeSubscription: (token: string) => Promise<void>
  readMemories: () => Promise<Map<string, M>>
  readMemory: (token: string) => Promise<M | undefined>
  writeMemory: (token: string, memory: M) => Promise<void>
}

export const createSubscriptionStore = <S extends { token: string }, M>(
  storage: DurableObjectStorage,
  /** The key prefix of this kind of subscription, e.g. "station-alerts". */
  prefix: string,
): SubscriptionStore<S, M> => {
  const subscriptionKey = (token: string) => `${prefix}:sub:${token}`
  const memoryKey = (token: string) => `${prefix}:mem:${token}`
  const tokenOf = (key: string, kind: "sub" | "mem") => key.slice(`${prefix}:${kind}:`.length)

  return {
    readSubscriptions: async () => [...(await storage.list<S>({ prefix: `${prefix}:sub:` })).values()],
    writeSubscription: async (subscription) => {
      await storage.put(subscriptionKey(subscription.token), subscription)
    },
    removeSubscription: async (token) => {
      await storage.delete([subscriptionKey(token), memoryKey(token)])
    },
    readMemories: async () => {
      const memories = new Map<string, M>()
      for (const [key, memory] of await storage.list<M>({ prefix: `${prefix}:mem:` })) memories.set(tokenOf(key, "mem"), memory)
      return memories
    },
    readMemory: (token) => storage.get<M>(memoryKey(token)),
    writeMemory: async (token, memory) => {
      await storage.put(memoryKey(token), memory)
    },
  }
}
