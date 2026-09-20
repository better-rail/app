/**
 * store.ts — the Delay Notifications subscriptions and what each device was told per
 * guard (see derive.ts GuardMemory), in redis. See utils/subscription-store.ts.
 */
import { logNames } from "../logs"
import type { StoredGuardSubscription } from "../types/delay-guards"
import { createSubscriptionStore } from "../utils/subscription-store"
import type { GuardMemory } from "./derive"

/** Per guard key (see types/delay-guards.ts guardKey) of a subscription. */
export type GuardSubscriptionMemory = Record<string, GuardMemory>

export const delayGuardStore = createSubscriptionStore<StoredGuardSubscription, GuardSubscriptionMemory>({
  subscriptionsKey: "delay-guards:subscriptions",
  memoryKey: "delay-guards:memory",
  corruptSubscriptionLog: logNames.delayGuards.corruptSubscription,
})
