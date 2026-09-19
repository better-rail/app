/**
 * Station alerts — the server's subscription for the stations the user asked to be pushed
 * about (settings store `stationAlerts`), kept in step by push-subscription-sync.ts.
 */
import { useSettingsStore } from "@/models/settings/settings"
import { stationAlertsApi } from "@/services/api"
import { createSubscriptionSync } from "./push-subscription-sync"

export const watchStationAlerts = createSubscriptionSync({
  items: (state) => state.stationAlerts,
  registered: (state) => state.stationAlertsRegistered,
  setRegistered: (registered) => useSettingsStore.getState().setStationAlertsRegistered(registered),
  subscribe: (device, alerts) =>
    stationAlertsApi.subscribe({
      ...device,
      stations: alerts.map((a) => ({ stationId: a.stationId, lineIds: a.lineIds, dayTypes: a.dayTypes })),
    }),
  unsubscribe: stationAlertsApi.unsubscribe,
})
