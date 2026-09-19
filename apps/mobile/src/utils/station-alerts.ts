/**
 * Station alerts — the server's subscription for the stations the user asked to be pushed
 * about (settings store `stationAlerts`), kept in step by push-subscription-sync.ts.
 */
import { userLocale } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import { stationAlertsApi } from "@/services/api"
import { Platform } from "react-native"
import { createSubscriptionSync } from "./push-subscription-sync"

export {
  type AlertsPermission,
  getPushPermission as getStationAlertsPermission,
  requestPushPermission as requestStationAlertsPermission,
} from "./push-subscription-sync"

const stationAlertsSync = createSubscriptionSync({
  items: (state) => state.stationAlerts,
  registered: (state) => state.stationAlertsRegistered,
  setRegistered: (registered) => useSettingsStore.getState().setStationAlertsRegistered(registered),
  subscribe: (token, alerts) =>
    stationAlertsApi.subscribe({
      token,
      provider: Platform.OS === "ios" ? "ios" : "android",
      locale: userLocale,
      stations: alerts.map((a) => ({ stationId: a.stationId, lineIds: a.lineIds, dayTypes: a.dayTypes })),
    }),
  unsubscribe: (token) => stationAlertsApi.unsubscribe(token),
})

export const syncStationAlerts = stationAlertsSync.sync
export const watchStationAlerts = stationAlertsSync.watch
