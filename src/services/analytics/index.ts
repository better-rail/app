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

export const trackEvent = (eventName: string, params?: AnalyticsParams) => {
  posthog.capture(eventName, params)
}

export const trackScreenView = (_params: AnalyticsParams) => {
  // posthog is already tracking screen views through <PostHogProvider />
}

export const trackPurchase = (params: AnalyticsParams) => {
  posthog.capture("tip_purchased", params)
}

export const setAnalyticsUserProperty = (name: string, value: string) => {
  setCachedPosthogProperty(name, value)
}

export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  setCachedPosthogProperties(properties)
}

export const identifyPosthogUser = async () => {
  await ensurePosthogPropertiesHydrated()
  const props = getCachedPosthogProperties()
  posthog.identify(undefined, props)
}

export const setAnalyticsCollectionEnabled = async (enabled: boolean) => {
  if (enabled) {
    await posthog.optIn()
  } else {
    await posthog.optOut()
  }
}

// Analytics is disabled in development by default. To verify events locally (e.g. PostHog),
// set EXPO_PUBLIC_ANALYTICS_IN_DEV=true in .env.local and restart the bundler with `-c`.
// Production behaviour is unaffected — this only relaxes the dev opt-out.
const ANALYTICS_ENABLED_IN_DEV = process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV === "true"

if (__DEV__ && !ANALYTICS_ENABLED_IN_DEV) {
  setAnalyticsCollectionEnabled(false)
  posthog.optOut()
} else if (__DEV__ && ANALYTICS_ENABLED_IN_DEV) {
  // PostHog persists opt-out state to storage, so a previous dev run that called optOut()
  // keeps it opted out across launches. Explicitly opt back in to clear that.
  posthog.optIn()
  // Log every capture/flush to the Metro console so events are easy to verify locally.
  posthog.debug(true)
}
