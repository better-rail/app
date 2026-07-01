import "@/i18n"
import "@/utils/ignore-warnings"
import React, { useState, useEffect, useRef } from "react"
import { AppState, Platform, useColorScheme } from "react-native"
import { useDeepLinking } from "@/hooks/use-deep-linking"
import { Stack } from "expo-router/stack"
import { useRouter, ErrorBoundary as ExpoErrorBoundary } from "expo-router"
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router/react-navigation"
import DeviceInfo from "react-native-device-info"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "react-query"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import notifee from "@notifee/react-native"
import * as Sentry from "@sentry/react-native"
import { enableScreens } from "react-native-screens"
import { PostHogProvider } from "posthog-react-native"
import { Observe, ObserveRoot, useObserve } from "expo-observe"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useIAP, initConnection, finishTransaction, getAvailablePurchases } from "react-native-iap"

import { initFonts } from "@/theme/fonts"
import * as storage from "@/utils/storage"
import { setupRootStore } from "@/models"
import { useRideStore } from "@/models/ride/ride"
import { useFavoritesStore } from "@/models/favorites/favorites"
import { setInitialLanguage, setUserLanguage } from "@/i18n/i18n"
import { posthog } from "@/services/analytics"
import { identifyPosthogUser, setAnalyticsUserProperty } from "@/services/analytics"
import { trackInstalledWidgets } from "@/utils/widget-helpers"
import { monitorLiveActivities } from "@/utils/ios-helpers"
import { useForceUpdate } from "@/hooks/use-force-update"
import { ForceUpdateScreen } from "@/screens/force-update/force-update-screen"
import { openActiveRide } from "@/utils/helpers/ride-helpers"
import PushNotification from "react-native-push-notification"
import "react-native-console-time-polyfill"

enableScreens()

// Enable per-route navigation metrics (cold/warm TTR, per-route TTI). Must run at
// module scope before any screen mounts — it cannot be toggled at runtime.
Observe.configure({
  integrations: { "expo-router": true },
})

const TELEMETRY_DISABLED_STORAGE_KEY = "telemetry_disabled"

Sentry.init({
  dsn: "https://203d8d08bca79bc415c95f41ab496d0b@o4510306230534144.ingest.us.sentry.io/4510307294248960",
  enabled: !__DEV__,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.mobileReplayIntegration({ maskAllText: false, maskAllImages: false, maskAllVectors: false })],
})

async function disableSentryIfTelemetryDisabled() {
  if (__DEV__) return
  try {
    const telemetryDisabled = await storage.load(TELEMETRY_DISABLED_STORAGE_KEY)
    if (telemetryDisabled) {
      Sentry.close()
    }
  } catch {}
}

disableSentryIfTelemetryDisabled()

// Capture render-phase errors per route via Expo Router's ErrorBoundary. Attaches
// route context to the event and marks in-flight navigation transactions as errored.
export const ErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(ExpoErrorBoundary)

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.captureException(error, {
        tags: { source: "react-query" },
        extra: { queryKey: query.queryKey },
      })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      Sentry.captureException(error, {
        tags: { source: "react-query-mutation" },
        extra: { mutationKey: mutation.options.mutationKey },
      })
    },
  }),
})

const isEmulator = DeviceInfo.isEmulatorSync()

function AppStack() {
  const colorScheme = useColorScheme()
  const { isUpdateRequired } = useForceUpdate()

  if (isUpdateRequired) return <ForceUpdateScreen />

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="active-ride" options={{ presentation: "modal" }} />
        <Stack.Screen name="announcements" options={{ presentation: "modal" }} />
        <Stack.Screen name="live-announcement" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="widget-onboarding" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal" }} />
      </Stack>
    </ThemeProvider>
  )
}

function RootLayout() {
  const [storeReady, setStoreReady] = useState(false)
  const [localeReady, setLocaleReady] = useState(false)
  const appState = useRef(AppState.currentState)
  const router = useRouter()
  const { markInteractive } = useObserve()

  useDeepLinking(storeReady)

  if (!isEmulator) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useIAP()
  }

  useEffect(() => {
    if (!storeReady) return
    useRideStore.getState().checkLiveActivitiesSupported().then((canRunLiveActivities) => {
      if (canRunLiveActivities === true) {
        monitorLiveActivities()
      }
    })
  }, [storeReady])

  useEffect(() => {
    if (Platform.OS === "android") {
      PushNotification.configure({
        onNotification(notification) {
          if (notification.userInteraction) {
            openActiveRide()
          }
        },
      })
    }
  }, [storeReady])

  useEffect(() => {
    if (!storeReady) return undefined
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        useFavoritesStore.getState().syncFavorites()
        const rideState = useRideStore.getState()
        rideState.checkLiveRideAuthorization()
        if (rideState.id) {
          rideState.isRideActive(rideState.id)
        }
      }
      appState.current = nextAppState
    })
    return () => subscription.remove()
  }, [storeReady])

  useEffect(() => {
    ;(async () => {
      await initFonts()
      setupRootStore().then(() => setStoreReady(true))
    })()
  }, [])

  useEffect(() => {
    identifyPosthogUser()
    trackInstalledWidgets()
    storage.load("appLanguage").then((languageCode) => {
      if (languageCode) {
        setUserLanguage(languageCode)
        setLocaleReady(true)
        setAnalyticsUserProperty("user_locale", languageCode)
        Sentry.setTag("user_locale", languageCode)
      } else {
        setInitialLanguage()
      }
    })
  }, [])

  useEffect(() => {
    if (!storeReady) return undefined
    const unsubscribe = notifee.onForegroundEvent(({ detail }) => {
      if (detail.notification?.data?.type === "service-update") {
        router.push("/announcements")
      }
    })
    return unsubscribe
  }, [storeReady])

  useEffect(() => {
    const flushAvailablePurchases = async () => {
      try {
        await initConnection()
        const availablePurchases = await getAvailablePurchases()
        availablePurchases.forEach((purchase) => {
          finishTransaction({ purchase, isConsumable: true })
        })
      } catch (error) {
        console.error("Failed to connect to IAP and finish all available transactions", error)
      }
    }
    if (!__DEV__) {
      flushAvailablePurchases()
    }
  }, [])

  useEffect(() => {
    // Signal EAS Observe that the app is interactive once the store + locale are
    // ready — this is the point we stop returning null and render the real UI.
    if (storeReady && localeReady) {
      markInteractive()
    }
  }, [storeReady, localeReady, markInteractive])

  if (!storeReady || !localeReady) return null

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ActionSheetProvider>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
              <AppStack />
            </PostHogProvider>
          </SafeAreaProvider>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}

export default Sentry.wrap(ObserveRoot.wrap(RootLayout))
