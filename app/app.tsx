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
import { AppState, Platform } from "react-native"
import { QueryClient, QueryClientProvider } from "react-query"
import type { NavigationContainerRef } from "@react-navigation/native"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import notifee from "@notifee/react-native"

import { initFonts } from "./theme/fonts" // expo
import * as storage from "./utils/storage"
import {
  useBackButtonHandler,
  RootNavigator,
  canExit,
  setRootNavigation,
  useNavigationPersistence,
  type RootParamList,
} from "./navigators"
import { type RootStore, RootStoreProvider, setupRootStore } from "./models"
import { setInitialLanguage, setUserLanguage } from "./i18n/i18n"
import "react-native-console-time-polyfill"
import { connectAsync, finishTransactionAsync, getPurchaseHistoryAsync } from "expo-in-app-purchases"
import * as Notifications from "expo-notifications"

// This puts screens in a native ViewController or Activity. If you want fully native
// stack navigation, use `createNativeStackNavigator` in place of `createStackNavigator`:
// https://github.com/kmagiera/react-native-screens#using-native-stack-navigator
import { enableScreens } from "react-native-screens"
import { monitorLiveActivities } from "./utils/ios-helpers"
import { useDeepLinking } from "./hooks/use-deep-linking"
import { openActiveRide } from "./utils/helpers/ride-helpers"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { createModalStack, ModalProvider } from "react-native-modalfy"
import { TipThanksModal } from "./screens/settings/components/tip-thanks-modal"
import { RouteListWarningModal } from "./screens/route-list/components/route-list-warning-modal"
import { DatePickerModal } from "./components/date-picker-modal/date-picker-modal.android"
import { analytics } from "./services/firebase/analytics"
enableScreens()

export const queryClient = new QueryClient()

const modalConfig = { TipThanksModal, RouteListWarningModal, DatePickerModal }
const defaultOptions = { backdropOpacity: 0.6 }

const stack = createModalStack(modalConfig, defaultOptions)

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"
/**
 * This is the root component of our app.
 */
function App() {
  const navigationRef = useRef<NavigationContainerRef<RootParamList>>(null)
  const [rootStore, setRootStore] = useState<RootStore | undefined>(undefined)
  const [localeReady, setLocaleReady] = useState(false)
  const appState = useRef(AppState.currentState)
  const [currentPurchase] = useState(null)

  useDeepLinking(rootStore, navigationRef)

  useEffect(() => {
    // Activate live activities listener on iOS 16.2+
    rootStore?.ride.checkLiveActivitiesSupported().then((canRunLiveActivities) => {
      if (canRunLiveActivities === true) {
        monitorLiveActivities()
      }
    })
  }, [rootStore])

  useEffect(() => {
    if (Platform.OS === "android") {
      // Configure expo notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowList: true,
        }),
      })

      // Listen for notification responses
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        openActiveRide(rootStore, navigationRef)
      })

      return () => subscription.remove()
    }
    return undefined
  }, [rootStore, navigationRef])

  useEffect(() => {
    // Refresh app state when app is opened from background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground!
        if (rootStore) {
          // Sync favorites
          rootStore.favoriteRoutes.syncFavorites()

          // Check Live Ride authorization
          rootStore.ride.checkLiveRideAuthorization()

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
        analytics.setUserProperty("user_locale", languageCode)
      } else {
        setInitialLanguage()
      }
    })
  }, [])

  useEffect(() => {
    // open the announcements screen if the app was opened from a notification
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (detail.notification.data?.type === "service-update") {
        navigationRef.current?.navigate("announcementsStack")
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    // load products and flush available purchases for the tip jar
    const flushAvailablePurchases = async () => {
      try {
        await connectAsync()
        const { results: availablePurchases } = await getPurchaseHistoryAsync()

        availablePurchases.forEach((purchase) => {
          finishTransactionAsync(purchase, true) // true for consumable items
        })
      } catch (error) {
        console.error("Failed to connect to IAP and finish all available transactions", error)
      }
    }

    // to avoid prompting for login during development, only flush purchases in production
    if (!__DEV__) {
      flushAvailablePurchases()
    }
  }, [currentPurchase])

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color. You can replace
  // with your own loading component if you wish.
  if (!rootStore || !localeReady) return null

  // otherwise, we're ready to render the app
  return (
    <QueryClientProvider client={queryClient}>
      <RootStoreProvider value={rootStore}>
        <GestureHandlerRootView>
          <ModalProvider stack={stack}>
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
          </ModalProvider>
        </GestureHandlerRootView>
      </RootStoreProvider>
    </QueryClientProvider>
  )
}

export default App
