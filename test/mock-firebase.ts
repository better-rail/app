jest.mock("@react-native-firebase/analytics", () => ({
  getAnalytics: () => ({
    logEvent: () => {},
    logScreenView: () => {},
    setUserProperties: () => {},
    setUserProperty: () => {},
    setAnalyticsCollectionEnabled: () => {},
  }),
}))
