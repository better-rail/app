import { useEffect, useRef } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter } from "react-native"
import { router } from "expo-router"
import { extractURLParams } from "@/utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "@/utils/ios-helpers"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"
import { openActiveRide } from "@/utils/helpers/open-active-ride"
import { trackEvent } from "@/services/analytics"
import { getWidgetFamilyFromURL } from "@/utils/widget-helpers"
import { getStationById } from "@/data/stations"
import { isWebsiteURL, parseWebsiteRouteURL } from "@/utils/helpers/web-links"
import { getInitialWebsiteHandoffURL } from "@/utils/website-handoff"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(storeReady: boolean) {
  const pendingURL = useRef<string | null>(null)

  function deepLinkWidgetURL(url: string) {
    if (!storeReady) return

    const family = getWidgetFamilyFromURL(url)
    trackEvent("deep_link_widget", family ? { family } : undefined)

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
    trackEvent("deep_link_live_activity")
    openActiveRide()
  }

  function deepLinkWebsiteURL(url: string) {
    if (!storeReady) return

    const route = parseWebsiteRouteURL(url)
    trackEvent("deep_link_website", { page: route ? "routes" : "other" })
    if (!route) return

    const origin = getStationById(route.originId)
    const destination = getStationById(route.destinationId)
    if (!origin || !destination || origin.id === destination.id) return
    const viaStation = route.viaStationId ? getStationById(route.viaStationId) : undefined

    const routePlan = useRoutePlanStore.getState()
    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)
    routePlan.setDate(new Date(route.time))
    // The website searches by departure time only.
    routePlan.setDateType("departure")

    router.push({
      pathname: "/route-list",
      params: {
        originId: origin.id,
        destinationId: destination.id,
        time: String(route.time),
        enableQuery: "true",
        ...(route.trip ? { trip: route.trip } : {}),
        ...(viaStation ? { viaStationId: viaStation.id } : {}),
      },
    })
  }

  function handleDeepLinkURL(url: string | null) {
    if (!url) return
    // Launch-time URL events (including Handoff) can arrive before persistence finishes.
    if (!storeReady) {
      pendingURL.current = url
      return
    }
    if (isWebsiteURL(url)) {
      deepLinkWebsiteURL(url)
      return
    }
    if (url.includes("widget")) {
      deepLinkWidgetURL(url)
    }
    if (url.toLowerCase().includes("liveactivity")) {
      deepLinkLiveActivity()
    }
  }

  function openHomeScreenShortcut(item: ShortcutItem | null) {
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

  useEffect(() => {
    let linkingListener: EmitterSubscription
    let shortcutsListener: EmitterSubscription
    let active = true
    const queuedURL = pendingURL.current
    let receivedURL = !!queuedURL

    if (storeReady && queuedURL) {
      pendingURL.current = null
      handleDeepLinkURL(queuedURL)
    }

    Linking.getInitialURL().then((url) => {
      // Prefer the latest URL event to a stale launch URL, and ignore an old effect's result.
      if (active && !receivedURL) handleDeepLinkURL(url ?? getInitialWebsiteHandoffURL())
    })

    linkingListener = Linking.addEventListener("url", ({ url }) => {
      receivedURL = true
      handleDeepLinkURL(url)
    })

    if (storeReady) {
      Shortcuts.getInitialShortcut().then(openHomeScreenShortcut)
      shortcutsListener = ShortcutsEmitter.addListener("onShortcutItemPressed", openHomeScreenShortcut)
    }

    return () => {
      active = false
      linkingListener?.remove()
      shortcutsListener?.remove()
    }
  }, [storeReady])
}
