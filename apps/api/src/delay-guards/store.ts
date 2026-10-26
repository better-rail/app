/**
 * store.ts — the Delay Notifications subscriptions and what each device was told per
 * guard (see derive.ts GuardMemory). See utils/subscription-store.ts.
 */
import { type DelayGuard, type DelayGuardSubscription, type StoredGuardSubscription, guardKey } from "../types/delay-guards"
import { type SubscriptionStore, createSubscriptionStore } from "../utils/subscription-store"
import type { GuardMemory } from "./derive"

/** Per guard key (see types/delay-guards.ts guardKey) of a subscription. */
export type GuardSubscriptionMemory = Record<string, GuardMemory>

export type DelayGuardStore = SubscriptionStore<StoredGuardSubscription, GuardSubscriptionMemory>

export const createDelayGuardStore = (storage: DurableObjectStorage): DelayGuardStore =>
  createSubscriptionStore<StoredGuardSubscription, GuardSubscriptionMemory>(storage, "delay-guards")

/** How a subscription's items are keyed and replaced (see alerts/alerts-do.ts). */
export const delayGuardItems = {
  itemsOf: (subscription: DelayGuardSubscription): DelayGuard[] => subscription.guards,
  keyOf: guardKey,
  withItems: (subscription: DelayGuardSubscription, guards: DelayGuard[]): DelayGuardSubscription => ({
    ...subscription,
    guards,
  }),
}
