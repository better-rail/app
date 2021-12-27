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
import { EmitterSubscription, Linking, Platform } from "react-native"
import { QueryClient, QueryClientProvider } from "react-query"
import { NavigationContainerRef } from "@react-navigation/native"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import { initFonts } from "./theme/fonts" // expo
import * as storage from "./utils/storage"
import { useBackButtonHandler, RootNavigator, canExit, setRootNavigation, useNavigationPersistence } from "./navigators"
import { RootStore, RootStoreProvider, setupRootStore } from "./models"
import { ToggleStorybook } from "../storybook/toggle-storybook"
import { setInitialLanguage, setUserLanguage } from "./i18n/i18n"
import "react-native-console-time-polyfill"

// This puts screens in a native ViewController or Activity. If you want fully native
// stack navigation, use `createNativeStackNavigator` in place of `createStackNavigator`:
// https://github.com/kmagiera/react-native-screens#using-native-stack-navigator
import { enableScreens } from "react-native-screens"
import { extractURLParams } from "./utils/helpers/url"
import { donateRouteIntent } from "./utils/ios-helpers"
enableScreens()

export const queryClient = new QueryClient()

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"
/**
 * This is the root component of our app.
 */
function App() {
  const navigationRef = useRef<NavigationContainerRef>()
  const [rootStore, setRootStore] = useState<RootStore | undefined>(undefined)
  const [localeReady, setLocaleReady] = useState(false)

  useEffect(function handleWidgetDeepLinking() {
    let linkingListener: EmitterSubscription

    function deepLinkWidgetURL(url: string) {
      const { originId, destinationId } = extractURLParams(url)
      donateRouteIntent(originId, destinationId)

      navigationRef.current?.navigate("routeList", {
        originId,
        destinationId,
        time: new Date().getTime(),
        enableQuery: true,
      })
    }

    if (Platform.OS === "ios") {
      Linking.getInitialURL().then((url) => {
        if (url) deepLinkWidgetURL(url)
      })

      linkingListener = Linking.addEventListener("url", ({ url }) => {
        deepLinkWidgetURL(url)
      })
    }

    if (linkingListener !== undefined) {
      return () => linkingListener.remove()
    }

    return null
  }, [])

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

export default App
