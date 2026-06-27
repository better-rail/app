import { useEffect } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter } from "react-native"
import { router } from "expo-router"
import { extractURLParams } from "@/utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "@/utils/ios-helpers"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"
import { useRideStore } from "@/models/ride/ride"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { isEqual } from "lodash"
import { trackEvent } from "@/services/analytics"
import { useStations } from "@/data/stations"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(storeReady: boolean) {
  const stations = useStations()

  function deepLinkWidgetURL(url: string) {
    if (!storeReady) return

    const { originId, destinationId } = extractURLParams(url)
    const routePlan = useRoutePlanStore.getState()

    const origin = stations.find((station) => station.id === originId)
    const destination = stations.find((station) => station.id === destinationId)

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

  function openActiveRideScreen() {
    const rideState = useRideStore.getState()
    const { route } = rideState
    const originId = rideState.originId()
    const destinationId = rideState.destinationId()
    if (!route) return

    useNavigationParamsStore.getState().setRouteDetails({
      routeItem: route,
      originId: String(originId),
      destinationId: String(destinationId),
    })
    router.push("/active-ride")
  }

  function deepLinkLiveActivity(url: string) {
    const currentRouteItem = useNavigationParamsStore.getState().routeItem

    if (!currentRouteItem) {
      openActiveRideScreen()
    } else {
      const { trains } = extractURLParams(url)
      const activityTrainNumbers = trains.split(",").map((t) => parseInt(t))
      const routeTrainNumbers = currentRouteItem.trains.map((t) => t.trainNumber)

      if (!isEqual(activityTrainNumbers, routeTrainNumbers)) {
        openActiveRideScreen()
      }
    }
  }

  function handleDeepLinkURL(url: string) {
    if (!url) return
    if (url.includes("widget")) {
      deepLinkWidgetURL(url)
      trackEvent("deep_link_widget")
    }
    if (url.includes("liveActivity")) {
      deepLinkLiveActivity(url)
      trackEvent("deep_link_live_activity")
    }
  }

  function openHomeScreenShortcut(item: ShortcutItem) {
    if (!item) return
    const origin = stations.find((station) => station.id === item.data.originId)
    const destination = stations.find((station) => station.id === item.data.destinationId)

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
