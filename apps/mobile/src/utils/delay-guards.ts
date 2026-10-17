/**
 * Delay Notifications — the server's subscription for the trains the user wants to hear about when
 * they run late (settings store `delayGuards`), kept in step by push-subscription-sync.ts.
 */
import { useSettingsStore } from "@/models/settings/settings"
import { delayGuardsApi } from "@/services/api"
import { DELAY_GUARD_CHANNEL } from "./push-channels"
import { createSubscriptionSync } from "./push-subscription-sync"

export const watchDelayGuards = createSubscriptionSync({
  name: "delay_guards",
  channelId: DELAY_GUARD_CHANNEL,
  items: (state) => state.delayGuards,
  registeredToken: (state) => state.delayGuardsToken,
  setRegisteredToken: (token) => useSettingsStore.getState().setDelayGuardsToken(token),
  subscribe: (device, guards) => delayGuardsApi.subscribe({ ...device, guards }),
  unsubscribe: delayGuardsApi.unsubscribe,
})
