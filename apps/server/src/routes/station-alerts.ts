/**
 * station-alerts.ts — PUT / DELETE /api/v1/station-alerts: a device registers the
 * stations (and lines) it wants pushes about, or unregisters. See subscription-routes.ts.
 */
import { stationsObject } from "../data/stations"
import { logNames } from "../logs"
import type { AlertMemory } from "../station-alerts/derive"
import { stationAlertStore } from "../station-alerts/store"
import {
  type StationAlertChoice,
  type StationAlertSubscription,
  StationAlertSubscriptionSchema,
  StationAlertUnsubscribeSchema,
} from "../types/station-alerts"
import { createSubscriptionRouter } from "./subscription-routes"

export const stationAlertsRouter = createSubscriptionRouter<StationAlertSubscription, StationAlertChoice, AlertMemory>({
  subscriptionSchema: StationAlertSubscriptionSchema,
  unsubscribeSchema: StationAlertUnsubscribeSchema,
  store: stationAlertStore,
  itemsOf: (subscription) => subscription.stations,
  keyOf: (choice) => choice.stationId,
  reject: (choice) => (stationsObject[choice.stationId] ? undefined : { reason: "unknown_station", stationId: choice.stationId }),
  withItems: (subscription, stations) => ({ ...subscription, stations }),
  log: logNames.stationAlerts,
})
