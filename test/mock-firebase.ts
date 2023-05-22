jest.mock("@react-native-firebase/analytics", () => {
  return () => ({ logEvent: () => {}, logScreenView: () => {}, setUserProperties: () => {} })
})
