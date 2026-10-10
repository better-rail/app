import { API_CONFIG } from "@/config/api-config"
import type { DelayGuardSubscription } from "./delay-guards.types"
import { createPushSubscriptionApi } from "./push-subscription-api"

/** PUT / DELETE /api/v1/delay-guards — the trains this device wants to hear about when they run late. */
export const delayGuardsApi = createPushSubscriptionApi<DelayGuardSubscription>(API_CONFIG.DELAY_GUARDS, "Delay Notifications")
