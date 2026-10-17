/**
 * store.ts — the station alert subscriptions and what each device was last told
 * per station (see derive.ts AlertMemory), in redis. See utils/subscription-store.ts.
 */
import { logNames } from "../logs"
import type { StoredSubscription } from "../types/station-alerts"
import { createSubscriptionStore } from "../utils/subscription-store"
import type { AlertMemory } from "./derive"

/** Per station of a subscription. */
export type SubscriptionMemory = Record<string, AlertMemory>

export const stationAlertStore = createSubscriptionStore<StoredSubscription, SubscriptionMemory>({
  subscriptionsKey: "station-alerts:subscriptions",
  memoryKey: "station-alerts:memory",
  corruptSubscriptionLog: logNames.stationAlerts.corruptSubscription,
})
