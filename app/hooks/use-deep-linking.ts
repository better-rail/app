import { MutableRefObject, useEffect } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter, Platform } from "react-native"
import { extractURLParams } from "../utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "../utils/ios-helpers"
import { useRoutePlanStore } from "../models/route-plan/route-plan"
import { useRideStore } from "../models/ride/ride"
import { PrimaryParamList, RootParamList } from "../navigators"
import { NavigationContainerRef } from "@react-navigation/native"
import { isEqual } from "lodash"
import { trackEvent } from "../services/analytics"
import { useStations } from "../data/stations"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(storeReady: boolean, navigationRef: MutableRefObject<NavigationContainerRef<RootParamList>>) {
  const stations = useStations()

  function deepLinkWidgetURL(url: string) {
    if (!storeReady) return

    const { originId, destinationId } = extractURLParams(url)
    const routePlan = useRoutePlanStore.getState()

    const origin = stations.find((station) => station.id === originId)
    const destination = stations.find((station) => station.id === destinationId)

    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)

    if (Platform.OS === "ios") {
      // iOS navigation - keep existing working logic
      // @ts-expect-error navigator type
      navigationRef.current?.navigate("routeList", {
        originId,
        destinationId,
        time: new Date().getTime(),
        enableQuery: true,
      })
    } else {
      // Android navigation - use nested navigation structure
      // @ts-expect-error navigator type
      navigationRef.current?.navigate("mainStack", {
        screen: "routeList",
        params: {
          originId,
          destinationId,
          time: new Date().getTime(),
          enableQuery: true,
        },
      })
    }

    // reload widget timeline
    reloadAllTimelines()
    donateRouteIntent(originId, destinationId)
  }

  function openActiveRideScreen() {
    const rideState = useRideStore.getState()
    const { route } = rideState
    const originId = rideState.originId()
    const destinationId = rideState.destinationId()
    if (!route) return

    // @ts-expect-error navigator type
    navigationRef.current?.navigate("activeRideStack", {
      screen: "activeRide",
      params: { routeItem: route, originId: originId, destinationId: destinationId },
    })
  }

  function deepLinkLiveActivity(url: string) {
    const { name: screenName, params: screenParams } = navigationRef.current?.getCurrentRoute()

    if (screenName != "routeDetails") {
      openActiveRideScreen()
    } else {
      // if we're on the route details screen, we need to check if it's the same route
      // as the live activity route, by using the provided train numbers in the activity deep link url
      const { trains } = extractURLParams(url)
      const activityTrainNumbers = trains.split(",").map((t) => parseInt(t))

      const { routeItem } = screenParams as PrimaryParamList["routeDetails"]
      const routeTrainNumbers = routeItem.trains.map((t) => t.trainNumber)

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

    // @ts-expect-error navigator type
    navigationRef.current?.navigate("mainStack", {
      screen: "routeList",
      params: {
        originId: origin?.id,
        destinationId: destination?.id,
        time: new Date().getTime(),
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
