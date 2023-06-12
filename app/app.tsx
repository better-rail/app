/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
import "./i18n"
import "./utils/ignore-warnings"
import React, { useState, useEffect, useRef } from "react"
import { AppState } from "react-native"
import { QueryClient, QueryClientProvider } from "react-query"
import { NavigationContainerRef } from "@react-navigation/native"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"

import analytics from "@react-native-firebase/analytics"
import crashlytics from "@react-native-firebase/crashlytics"

import { initFonts } from "./theme/fonts" // expo
import * as storage from "./utils/storage"
import {
  useBackButtonHandler,
  RootNavigator,
  canExit,
  setRootNavigation,
  useNavigationPersistence,
  RootParamList,
} from "./navigators"
import { RootStore, RootStoreProvider, setupRootStore } from "./models"
import { ToggleStorybook } from "../storybook/toggle-storybook"
import { setInitialLanguage, setUserLanguage } from "./i18n/i18n"
import "react-native-console-time-polyfill"
import { withIAPContext } from "react-native-iap"

// Disable tracking in development environment
if (__DEV__) {
  analytics().setAnalyticsCollectionEnabled(false)
  crashlytics().setCrashlyticsCollectionEnabled(false)
}

// This puts screens in a native ViewController or Activity. If you want fully native
// stack navigation, use `createNativeStackNavigator` in place of `createStackNavigator`:
// https://github.com/kmagiera/react-native-screens#using-native-stack-navigator
import { enableScreens } from "react-native-screens"
import { canRunLiveActivities, monitorLiveActivities } from "./utils/ios-helpers"
import { useDeepLinking } from "./hooks/use-deep-linking"
enableScreens()

export const queryClient = new QueryClient()

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"
/**
 * This is the root component of our app.
 */
function App() {
  const navigationRef = useRef<NavigationContainerRef<RootParamList>>()
  const [rootStore, setRootStore] = useState<RootStore | undefined>(undefined)
  const [localeReady, setLocaleReady] = useState(false)
  const appState = useRef(AppState.currentState)

  useDeepLinking(rootStore, navigationRef)

  useEffect(() => {
    // Activate live activities listener on iOS 16.2+
    if (canRunLiveActivities) {
      monitorLiveActivities()
    }
  }, [])

  useEffect(() => {
    // Refresh app state when app is opened from background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground!
        if (rootStore) {
          // Check Live Activities authorization
          rootStore.ride.checkActivityAuthorizationInfo()

          if (rootStore.ride.id) {
            // Check if the current ride id is still active
            rootStore.ride.isRideActive(rootStore.ride.id)
          }
        }
      }

      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [rootStore])

  setRootNavigation(navigationRef)
  useBackButtonHandler(navigationRef, canExit)
  const { initialNavigationState, onNavigationStateChange } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  // Kick off initial async loading actions, like loading fonts and RootStore
  useEffect(() => {
    ;(async () => {
      await initFonts() // expo
      setupRootStore().then(setRootStore)
    })()
  }, [])

  useEffect(() => {
    storage.load("appLanguage").then((languageCode) => {
      if (languageCode) {
        setUserLanguage(languageCode)
        setLocaleReady(true)
        analytics().setUserProperties({ userLocale: languageCode })
      } else {
        setInitialLanguage()
      }
    })
  }, [])

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color. You can replace
  // with your own loading component if you wish.
  if (!rootStore || !localeReady) return null

  // otherwise, we're ready to render the app
  return (
    <ToggleStorybook>
      <QueryClientProvider client={queryClient}>
        <RootStoreProvider value={rootStore}>
          <ActionSheetProvider>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
              {__DEV__ ? (
                // Use navigation persistence for development
                <RootNavigator
                  ref={navigationRef}
                  initialState={initialNavigationState}
                  onStateChange={onNavigationStateChange}
                />
              ) : (
                <RootNavigator ref={navigationRef} />
              )}
            </SafeAreaProvider>
          </ActionSheetProvider>
        </RootStoreProvider>
      </QueryClientProvider>
    </ToggleStorybook>
  )
}

export default withIAPContext(App)
