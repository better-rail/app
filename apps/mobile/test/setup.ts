// libraries to mock
import "./mock-assets"
import "./mock-react-native"
import "./mock-async-storage"
import "./mock-expo-localization"
import "./mock-i18n"
import "./mock-env"
import "./mock-expo-secure-store"
import "./mock-expo-notifications"
import "./mock-device-info"

declare global {
  // @ts-ignore - React Native global variable
  let __DEV__: boolean
}

// Set global variables for React Native
// @ts-ignore - React Native global variable
globalThis.__DEV__ = false
