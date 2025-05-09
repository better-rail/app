import { getAnalytics } from "@react-native-firebase/analytics"

export const analytics = getAnalytics()

if (__DEV__) {
  analytics.setAnalyticsCollectionEnabled(false)
}

export const logAnalyticsEvent = (eventName: string) => {
  analytics.logEvent(eventName)
}
