import { getCrashlytics, setCrashlyticsCollectionEnabled } from "@react-native-firebase/crashlytics"

export const crashlytics = getCrashlytics()

if (__DEV__) {
  setCrashlyticsCollectionEnabled(crashlytics, false)
}
