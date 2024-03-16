// This is the first file that ReactNative will run when it starts up.
//
// We jump out of here immediately and into our main entry point instead.
//
// It is possible to have React Native load our main module first, but we'd have to
// change that in both AppDelegate.m and MainApplication.java.  This would have the
// side effect of breaking other tooling like mobile-center and react-native-rename.
//
// It's easier just to leave it here.
import { AppRegistry, Platform } from "react-native"
import messaging from "@react-native-firebase/messaging"
import notifee, { AndroidLaunchActivityFlag } from "@notifee/react-native"

import App from "./app/app"
import { configureAndroidNotifications } from "./app/utils/android-helpers"
import AsyncStorage from "@react-native-async-storage/async-storage"

if (Platform.OS === "android") {
  configureAndroidNotifications()
}

/**
 * Handle incoming notifications
 */
const onRecievedMessage = async (message) => {
  const { title, body, stations } = message.data
  const parsedStations = JSON.parse(stations)

  let displayNotification = false

  // If no stations are specified, it means all stations
  // are selected for notifications
  if (parsedStations.length === 0) {
    displayNotification = true
  } else {
    const rootStoreString = await AsyncStorage.getItem("root")
    const rootStore = JSON.parse(rootStoreString)

    const stationsNotifications = rootStore.settings.stationsNotifications

    parsedStations.find((station) => {
      if (stationsNotifications.includes(station)) {
        displayNotification = true
        return true
      }

      return false
    })
  }

  if (displayNotification) {
    notifee.displayNotification({
      title,
      body,
      ios: { sound: "default" },
      android: {
        channelId: "better-rail-service-updates",
        smallIcon: "notification_icon",
        timeoutAfter: 60 * 1000,
        pressAction: {
          id: "default",
          launchActivity: "com.betterrail.MainActivity",
          launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
        },
      },
    })
  }
}

messaging().onMessage(onRecievedMessage)
messaging().setBackgroundMessageHandler(onRecievedMessage)

AppRegistry.registerComponent("BetterRail", () => App)
export default App
