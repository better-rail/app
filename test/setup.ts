// libraries to mock
import "./mock-react-native"
import "./mock-async-storage"
import "./mock-expo-localization"
import "./mock-i18n"
import "./mock-firebase"

declare global {
  // @ts-ignore - React Native global variable
  let __DEV__: boolean
}

// Set global variables for React Native
// @ts-ignore - React Native global variable
globalThis.__DEV__ = false
