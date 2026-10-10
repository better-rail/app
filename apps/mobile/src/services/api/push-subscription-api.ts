import axios from "axios"
import type { LanguageCode } from "@/i18n"

/** What every push subscription carries about this device, besides the list itself. */
export type PushDevice = {
  /** The device push token: APNs on iOS, FCM on Android. */
  token: string
  provider: "ios" | "android"
  locale: LanguageCode
}

export type PushSubscriptionApi<Subscription extends PushDevice> = {
  /** PUT the device's whole subscription; the server replaces what it held. */
  subscribe: (subscription: Subscription) => Promise<void>
  /** DELETE the device's subscription. */
  unsubscribe: (token: string) => Promise<void>
}

/** A PUT / DELETE endpoint keeping a device's push subscription (station alerts, Delay Notifications). */
export const createPushSubscriptionApi = <Subscription extends PushDevice>(
  baseURL: string,
  name: string,
): PushSubscriptionApi<Subscription> => {
  const client = axios.create({
    baseURL,
    timeout: 20000,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  })
  return {
    subscribe: async (subscription) => {
      const response = await client.put<{ success: boolean }>("", subscription)
      if (!response.data?.success) throw new Error(`${name} subscription was not accepted`)
    },
    unsubscribe: async (token) => {
      const response = await client.delete<{ success: boolean }>("", { data: { token } })
      if (!response.data?.success) throw new Error(`${name} unsubscribe was not accepted`)
    },
  }
}
