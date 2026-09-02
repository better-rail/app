import { useEffect } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter } from "react-native"
import { router, useNavigationContainerRef } from "expo-router"
import { extractURLParams } from "@/utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "@/utils/ios-helpers"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"
import { openActiveRide } from "@/utils/helpers/open-active-ride"
import { trackEvent } from "@/services/analytics"
import { getStationById } from "@/data/stations"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

// The route list's screen name inside the `(main)` stack, as declared in `app/(main)/_layout.tsx`.
const ROUTE_LIST_SCREEN = "route-list"

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(storeReady: boolean) {
  // Read the focused route lazily off the navigation container rather than through
  // `usePathname()` — this hook lives in the root layout, so subscribing to route info
  // here would re-render the entire app on every navigation.
  const navigationRef = useNavigationContainerRef()

  /**
   * Whether the route list for this exact origin/destination pair is the screen currently
   * on top of the stack.
   */
  function isRouteListShowing(originId: string, destinationId: string) {
    if (!navigationRef.isReady()) return false

    // `getCurrentRoute()` is typed against `ReactNavigation.RootParamList`, which is empty
    // without typed routes — hence the cast to the shape it actually returns.
    const currentRoute = navigationRef.getCurrentRoute() as { name: string; params?: Record<string, unknown> } | undefined
    if (currentRoute?.name !== ROUTE_LIST_SCREEN) return false

    return currentRoute.params?.originId === originId && currentRoute.params?.destinationId === destinationId
  }

  function deepLinkWidgetURL(url: string) {
    if (!storeReady) return

    const { originId, destinationId } = extractURLParams(url)
    const routePlan = useRoutePlanStore.getState()

    const origin = getStationById(originId)
    const destination = getStationById(destinationId)

    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)

    // Tapping the widget for the route that's already on screen keeps the user where they
    // are, instead of stacking another copy of the same route list on top of it.
    if (!isRouteListShowing(originId, destinationId)) {
      router.push({
        pathname: "/route-list",
        params: {
          originId,
          destinationId,
          time: String(new Date().getTime()),
          enableQuery: "true",
        },
      })
    }

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

  useEffect(() => {
    let linkingListener: EmitterSubscription
    let shortcutsListener: EmitterSubscription

    Linking.getInitialURL().then(handleDeepLinkURL)

    linkingListener = Linking.addEventListener("url", ({ url }) => {
      handleDeepLinkURL(url)
    })

    if (storeReady) {
      Shortcuts.getInitialShortcut().then(openHomeScreenShortcut)
      shortcutsListener = ShortcutsEmitter.addListener("onShortcutItemPressed", openHomeScreenShortcut)
    }

    return () => {
      linkingListener?.remove()
      shortcutsListener?.remove()
    }
  }, [storeReady])
}
