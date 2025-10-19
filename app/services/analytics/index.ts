import { POSTHOG_API_KEY } from "@env"
import { getAnalytics } from "@react-native-firebase/analytics"
import PostHog, { PostHogOptions } from "posthog-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ensurePosthogPropertiesHydrated, getCachedPosthogProperties, setCachedPosthogProperties, setCachedPosthogProperty } from "./posthog-user-properties"

export const posthogOptions: PostHogOptions = {
  host: "https://eu.i.posthog.com",
  persistence: "file" as const,
  customStorage: AsyncStorage,
  enableSessionReplay: true
}

export const posthog = new PostHog(POSTHOG_API_KEY, posthogOptions)

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
}

export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  firebaseAnalytics.setUserProperties(properties)

  const updated = setCachedPosthogProperties(properties)

  if (Object.keys(updated).length === 0) {
    return
  }
}

export const identifyPosthogUser = async () => {
  await ensurePosthogPropertiesHydrated()
  const props = getCachedPosthogProperties()
  posthog.identify(undefined, props)
}

export const setAnalyticsCollectionEnabled = async (enabled: boolean) => {
  await firebaseAnalytics.setAnalyticsCollectionEnabled(enabled)

  if (enabled) {
    await posthog.optIn()
  } else {
    await posthog.optOut()
  }
}

if (__DEV__) {
  setAnalyticsCollectionEnabled(false)
  posthog.optOut()
}
