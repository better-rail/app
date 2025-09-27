import { getAnalytics } from "@react-native-firebase/analytics"

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

const firebaseAnalytics = getAnalytics()

export const trackEvent = (eventName: string, params?: AnalyticsParams) => {
  firebaseAnalytics.logEvent(eventName, params)
}

export const trackScreenView = (params: AnalyticsParams) => {
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

export const setAnalyticsUserProperties = (properties: AnalyticsParams) => {
  firebaseAnalytics.setUserProperties(properties)
}

export const setAnalyticsCollectionEnabled = (enabled: boolean) => {
  firebaseAnalytics.setAnalyticsCollectionEnabled(enabled)
}

if (__DEV__) {
  setAnalyticsCollectionEnabled(false)
}
