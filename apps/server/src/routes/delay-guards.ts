/**
 * delay-guards.ts — PUT / DELETE /api/v1/delay-guards: a device registers the
 * trains it guards, or unregisters. See subscription-routes.ts.
 */
import { stationsObject } from "../data/stations"
import type { GuardMemory } from "../delay-guards/derive"
import { delayGuardStore } from "../delay-guards/store"
import { logNames } from "../logs"
import {
  type DelayGuard,
  type DelayGuardSubscription,
  DelayGuardSubscriptionSchema,
  DelayGuardUnsubscribeSchema,
  guardKey,
} from "../types/delay-guards"
import { createSubscriptionRouter } from "./subscription-routes"

export const delayGuardsRouter = createSubscriptionRouter<DelayGuardSubscription, DelayGuard, GuardMemory>({
  subscriptionSchema: DelayGuardSubscriptionSchema,
  unsubscribeSchema: DelayGuardUnsubscribeSchema,
  store: delayGuardStore,
  itemsOf: (subscription) => subscription.guards,
  keyOf: guardKey,
  reject: (guard) =>
    stationsObject[guard.originStationId] && stationsObject[guard.destinationStationId]
      ? undefined
      : { reason: "unknown_station" },
  withItems: (subscription, guards) => ({ ...subscription, guards }),
  log: logNames.delayGuards,
})
