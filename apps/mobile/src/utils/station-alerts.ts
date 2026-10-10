/**
 * Station alerts — the server's subscription for the stations the user asked to be pushed
 * about (settings store `stationAlerts`), kept in step by push-subscription-sync.ts.
 */
import { useSettingsStore } from "@/models/settings/settings"
import { stationAlertsApi } from "@/services/api"
import { STATION_ALERTS_CHANNEL } from "./push-channels"
import { createSubscriptionSync } from "./push-subscription-sync"

export const watchStationAlerts = createSubscriptionSync({
  name: "station_alerts",
  channelId: STATION_ALERTS_CHANNEL,
  items: (state) => state.stationAlerts,
  registeredToken: (state) => state.stationAlertsToken,
  setRegisteredToken: (token) => useSettingsStore.getState().setStationAlertsToken(token),
  subscribe: (device, alerts) =>
    stationAlertsApi.subscribe({
      ...device,
      stations: alerts.map((a) => ({ stationId: a.stationId, lineIds: a.lineIds, dayTypes: a.dayTypes })),
    }),
  unsubscribe: stationAlertsApi.unsubscribe,
})
