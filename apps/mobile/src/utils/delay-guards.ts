/**
 * Delay Guard — the server's subscription for the trains the user wants to hear about when
 * they run late (settings store `delayGuards`), kept in step by push-subscription-sync.ts.
 */
import { userLocale } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import { delayGuardsApi } from "@/services/api"
import { Platform } from "react-native"
import { createSubscriptionSync } from "./push-subscription-sync"

const delayGuardsSync = createSubscriptionSync({
  items: (state) => state.delayGuards,
  registered: (state) => state.delayGuardsRegistered,
  setRegistered: (registered) => useSettingsStore.getState().setDelayGuardsRegistered(registered),
  subscribe: (token, guards) =>
    delayGuardsApi.subscribe({ token, provider: Platform.OS === "ios" ? "ios" : "android", locale: userLocale, guards }),
  unsubscribe: (token) => delayGuardsApi.unsubscribe(token),
})

export const syncDelayGuards = delayGuardsSync.sync
export const watchDelayGuards = delayGuardsSync.watch
