import { useEffect, useRef } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter } from "react-native"
import { router } from "expo-router"
import { extractURLParams } from "@/utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "@/utils/ios-helpers"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"
import { openActiveRide } from "@/utils/helpers/open-active-ride"
import { trackEvent } from "@/services/analytics"
import { getStationById } from "@/data/stations"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(storeReady: boolean) {
  function deepLinkWidgetURL(url: string) {
    if (!storeReady) return

    const { originId, destinationId } = extractURLParams(url)
    const routePlan = useRoutePlanStore.getState()

    const origin = getStationById(originId)
    const destination = getStationById(destinationId)

    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)

    router.push({
      pathname: "/route-list",
      params: {
        originId,
        destinationId,
        time: String(new Date().getTime()),
        enableQuery: "true",
      },
    })

    reloadAllTimelines()
    donateRouteIntent(originId, destinationId)
  }

  function deepLinkLiveActivity() {
    if (!storeReady) return
    openActiveRide()
  }

  function handleDeepLinkURL(url: string) {
    if (!url) return
    if (url.includes("widget")) {
      deepLinkWidgetURL(url)
      trackEvent("deep_link_widget")
    }
    if (url.toLowerCase().includes("liveactivity")) {
      deepLinkLiveActivity()
      trackEvent("deep_link_live_activity")
    }
  }

  function openHomeScreenShortcut(item: ShortcutItem) {
    if (!item) return
    const origin = getStationById(item.data.originId)
    const destination = getStationById(item.data.destinationId)

    const routePlan = useRoutePlanStore.getState()
    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)
    routePlan.setDate(new Date())

    router.push({
      pathname: "/route-list",
      params: {
        originId: origin?.id,
        destinationId: destination?.id,
        time: String(new Date().getTime()),
        enableQuery: "true",
      },
    })
  }

  const initialUrlRef = useRef<string | null>(null)

  // Run once on mount: fetch the initial URL and register the URL listener.
  // Keeping this separate from the storeReady effect prevents multiple
  // Linking.getInitialURL() calls, which causes a ConcurrentModificationException
  // in React Native's IntentModule on Android.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      initialUrlRef.current = url
    })

    const linkingListener = Linking.addEventListener("url", ({ url }) => {
      handleDeepLinkURL(url)
    })

    return () => {
      linkingListener.remove()
    }
  }, [])

  // Process the initial URL and shortcuts once the store is ready.
  useEffect(() => {
    if (!storeReady) return

    if (initialUrlRef.current) {
      handleDeepLinkURL(initialUrlRef.current)
    }

    let shortcutsListener: EmitterSubscription
    Shortcuts.getInitialShortcut().then(openHomeScreenShortcut)
    shortcutsListener = ShortcutsEmitter.addListener("onShortcutItemPressed", openHomeScreenShortcut)

    return () => {
      shortcutsListener?.remove()
    }
  }, [storeReady])
}
