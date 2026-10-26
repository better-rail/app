/**
 * delay-guards.ts — PUT / DELETE /api/v1/delay-guards: a device registers the
 * trains it guards, or unregisters. See subscription-routes.ts.
 */
import { ALERTS_NAME } from "../alerts/alerts-do"
import { stationsObject } from "../data/stations"
import { logNames } from "../logs"
import { runtime } from "../runtime"
import {
  type DelayGuard,
  type DelayGuardSubscription,
  DelayGuardSubscriptionSchema,
  DelayGuardUnsubscribeSchema,
} from "../types/delay-guards"
import { createSubscriptionRoutes } from "./subscription-routes"

const alerts = () => runtime().ALERTS.getByName(ALERTS_NAME)

export const delayGuardsRoutes = createSubscriptionRoutes<DelayGuardSubscription, DelayGuard>({
  prefix: "/delay-guards",
  subscriptionSchema: DelayGuardSubscriptionSchema,
  unsubscribeSchema: DelayGuardUnsubscribeSchema,
  itemsOf: (subscription) => subscription.guards,
  reject: (guard) =>
    stationsObject[guard.originStationId] && stationsObject[guard.destinationStationId]
      ? undefined
      : { reason: "unknown_station" },
  subscribe: (subscription) => alerts().subscribeDelayGuards(subscription),
  unsubscribe: (token) => alerts().unsubscribeDelayGuards(token),
  log: logNames.delayGuards,
})
