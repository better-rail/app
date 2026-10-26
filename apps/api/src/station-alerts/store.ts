/**
 * store.ts — the station alert subscriptions and what each device was last told
 * per station (see derive.ts AlertMemory). See utils/subscription-store.ts.
 */
import type { StationAlertChoice, StationAlertSubscription, StoredSubscription } from "../types/station-alerts"
import { type SubscriptionStore, createSubscriptionStore } from "../utils/subscription-store"
import type { AlertMemory } from "./derive"

/** Per station of a subscription. */
export type SubscriptionMemory = Record<string, AlertMemory>

export type StationAlertStore = SubscriptionStore<StoredSubscription, SubscriptionMemory>

export const createStationAlertStore = (storage: DurableObjectStorage): StationAlertStore =>
  createSubscriptionStore<StoredSubscription, SubscriptionMemory>(storage, "station-alerts")

/** How a subscription's items are keyed and replaced (see alerts/alerts-do.ts). */
export const stationAlertItems = {
  itemsOf: (subscription: StationAlertSubscription): StationAlertChoice[] => subscription.stations,
  keyOf: (choice: StationAlertChoice): string => choice.stationId,
  withItems: (subscription: StationAlertSubscription, stations: StationAlertChoice[]): StationAlertSubscription => ({
    ...subscription,
    stations,
  }),
}
