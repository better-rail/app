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

// Inlined into the JS bundle by babel-preset-expo (EXPO_PUBLIC_* prefix). Available in EAS
// builds via the EAS env var of the same name — unlike the old `@env` file-based key, which
// the cloud build couldn't see (.env is git-ignored).
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY

// PostHog's constructor THROWS "You must pass your PostHog project's api key." for a falsy key,
// at module load — which hard-crashes the app at launch before any error handler or Sentry can
// run. (This is exactly what took down the first release builds: the EAS env var was misnamed, so
// the key was undefined.) Never let a missing/misconfigured key crash startup — fall back to a
// disabled client (placeholder key passes the falsy check; `disabled` makes it a no-op).
export const posthog = POSTHOG_API_KEY
  ? new PostHog(POSTHOG_API_KEY, posthogOptions)
  : new PostHog("phc_disabled_placeholder", { ...posthogOptions, enableSessionReplay: false, disabled: true })

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
