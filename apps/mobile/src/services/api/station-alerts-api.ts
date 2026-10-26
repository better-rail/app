import { API_CONFIG } from "@/config/api-config"
import { createPushSubscriptionApi } from "./push-subscription-api"
import type { StationAlertSubscription } from "./station-alerts.types"

/** PUT / DELETE /api/v1/station-alerts — the stations (and lines) this device wants pushes about. */
export const stationAlertsApi = createPushSubscriptionApi<StationAlertSubscription>(API_CONFIG.STATION_ALERTS, "Station alerts")
