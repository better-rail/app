import { POSTHOG_API_KEY } from "@env"
import { getAnalytics } from "@react-native-firebase/analytics"
import PostHog from 'posthog-react-native'
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  hydratePosthogProperties,
  setCachedPosthogProperties,
  setCachedPosthogProperty,
} from "./posthog-user-properties"

export const posthogOptions = {
  host: "https://eu.i.posthog.com",
  persistence: "file" as const,
  customStorage: AsyncStorage,
}

export const posthog = new PostHog(POSTHOG_API_KEY, posthogOptions)

void hydratePosthogProperties()

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

const firebaseAnalytics = getAnalytics()

export const trackEvent = (eventName: string, params?: AnalyticsParams) => {
  firebaseAnalytics.logEvent(eventName, params)
  posthog.capture(eventName, params)
}

export const trackScreenView = (params: AnalyticsParams) => {
  firebaseAnalytics.logScreenView(params)
  // posthog is already tracking screen views through <PostHogProvider />
}

export const trackPurchase = (params: AnalyticsParams) => {
    firebaseAnalytics.logPurchase(params)
    posthog.capture("tip_purchased", params)
}

export const setAnalyticsUserProperty = (name: string, value: string) => {
  firebaseAnalytics.setUserProperty(name, value)

  const updated = setCachedPosthogProperty(name, value)

  if (Object.keys(updated).length === 0) {
    return
  }

  posthog.identify(undefined, updated)
}

export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  firebaseAnalytics.setUserProperties(properties)

  const updated = setCachedPosthogProperties(properties)

  if (Object.keys(updated).length === 0) {
    return
  }

  posthog.identify(undefined, updated)
}

export const setAnalyticsCollectionEnabled = (enabled: boolean) => {
  firebaseAnalytics.setAnalyticsCollectionEnabled(enabled)
}

if (__DEV__) {
  setAnalyticsCollectionEnabled(false)
}
