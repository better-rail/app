import { getCrashlytics } from "@react-native-firebase/crashlytics"

export const crashlytics = getCrashlytics()

if (__DEV__) {
  crashlytics.setCrashlyticsCollectionEnabled(false)
}
