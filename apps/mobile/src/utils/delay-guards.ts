/**
 * Delay Notifications — the server's subscription for the trains the user wants to hear about when
 * they run late (settings store `delayGuards`), kept in step by push-subscription-sync.ts.
 */
import { useSettingsStore } from "@/models/settings/settings"
import { delayGuardsApi } from "@/services/api"
import { createSubscriptionSync } from "./push-subscription-sync"

export const watchDelayGuards = createSubscriptionSync({
  items: (state) => state.delayGuards,
  registered: (state) => state.delayGuardsRegistered,
  setRegistered: (registered) => useSettingsStore.getState().setDelayGuardsRegistered(registered),
  subscribe: (device, guards) => delayGuardsApi.subscribe({ ...device, guards }),
  unsubscribe: delayGuardsApi.unsubscribe,
})
