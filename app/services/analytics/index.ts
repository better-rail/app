import { getAnalytics } from "@react-native-firebase/analytics"

const firebaseAnalytics = getAnalytics()

export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
) => {
  firebaseAnalytics.logEvent(eventName, params)
}

export const trackScreenView = (
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  firebaseAnalytics.logScreenView(params)
}

export const trackPurchase = (params: Record<string, unknown>) => {
  if (typeof firebaseAnalytics.logPurchase === "function") {
    firebaseAnalytics.logPurchase(params)
    return
  }

  firebaseAnalytics.logEvent("purchase", params)
}

export const setAnalyticsUserProperty = (name: string, value: string) => {
  firebaseAnalytics.setUserProperty(name, value)
}

export const setAnalyticsUserProperties = (properties: Record<string, string | null | undefined>) => {
  firebaseAnalytics.setUserProperties(properties)
}

export const setAnalyticsCollectionEnabled = (enabled: boolean) => {
  firebaseAnalytics.setAnalyticsCollectionEnabled(enabled)
}

if (__DEV__) {
  setAnalyticsCollectionEnabled(false)
}
