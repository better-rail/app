import AsyncStorage from "@react-native-async-storage/async-storage"
import { getAnalytics } from "@react-native-firebase/analytics"
import PostHog from 'posthog-react-native'

export const posthogOptions = {
  host: "https://eu.i.posthog.com",
  persistence: "file" as const,
  customStorage: AsyncStorage,
}

export const posthog = new PostHog("phc_86hcnoNOI0EchduJZT2EWStBYa7bNEJKE1f5013nHyH", posthogOptions)

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

const firebaseAnalytics = getAnalytics()

export const trackEvent = (eventName: string, params?: AnalyticsParams) => {
  firebaseAnalytics.logEvent(eventName, params)
  posthog.capture(eventName, params)
}

export const trackScreenView = (params: AnalyticsParams) => {
  firebaseAnalytics.logScreenView(params)
}

export const trackPurchase = (params: AnalyticsParams) => {
    firebaseAnalytics.logPurchase(params)
    posthog.capture("tip_purchased", params)
}

export const setAnalyticsUserProperty = (name: string, value: string) => {
  firebaseAnalytics.setUserProperty(name, value)
  posthog.identify(posthog.getDistinctId(), { [name]: value })
}

export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  firebaseAnalytics.setUserProperties(properties)
  posthog.identify(posthog.getDistinctId(), properties)
}

export const setAnalyticsCollectionEnabled = (enabled: boolean) => {
  firebaseAnalytics.setAnalyticsCollectionEnabled(enabled)
}

if (__DEV__) {
  setAnalyticsCollectionEnabled(false)
}
