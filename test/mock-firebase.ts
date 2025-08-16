import { mock } from "bun:test"

mock.module("@react-native-firebase/analytics", () => ({
  getAnalytics: () => ({
    logEvent: () => {},
    logScreenView: () => {},
    setUserProperties: () => {},
    setUserProperty: () => {},
    setAnalyticsCollectionEnabled: () => {},
  }),
}))
