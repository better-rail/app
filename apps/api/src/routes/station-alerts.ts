/**
 * station-alerts.ts — PUT / DELETE /api/v1/station-alerts: a device registers the
 * stations (and lines) it wants pushes about, or unregisters. See subscription-routes.ts.
 */
import { ALERTS_NAME } from "../alerts/alerts-do"
import { stationsObject } from "../data/stations"
import { logNames } from "../logs"
import { runtime } from "../runtime"
import {
  type StationAlertChoice,
  type StationAlertSubscription,
  StationAlertSubscriptionSchema,
  StationAlertUnsubscribeSchema,
} from "../types/station-alerts"
import { createSubscriptionRoutes } from "./subscription-routes"

const alerts = () => runtime().ALERTS.getByName(ALERTS_NAME)

export const stationAlertsRoutes = createSubscriptionRoutes<StationAlertSubscription, StationAlertChoice>({
  prefix: "/station-alerts",
  subscriptionSchema: StationAlertSubscriptionSchema,
  unsubscribeSchema: StationAlertUnsubscribeSchema,
  itemsOf: (subscription) => subscription.stations,
  reject: (choice) => (stationsObject[choice.stationId] ? undefined : { reason: "unknown_station", stationId: choice.stationId }),
  subscribe: (subscription) => alerts().subscribeStationAlerts(subscription),
  unsubscribe: (token) => alerts().unsubscribeStationAlerts(token),
  log: logNames.stationAlerts,
})
