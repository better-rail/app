import { MutableRefObject, useEffect } from "react"
import { EmitterSubscription, Linking, NativeEventEmitter, Platform } from "react-native"
import { extractURLParams } from "../utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "../utils/ios-helpers"
import { RootStore } from "../models"
import { PrimaryParamList, RootParamList } from "../navigators"
import { NavigationContainerRef } from "@react-navigation/native"
import { isEqual } from "lodash"
import { analytics } from "../services/firebase/analytics"
import { useStations } from "../data/stations"
import Shortcuts, { ShortcutItem } from "react-native-quick-actions-shortcuts"

const ShortcutsEmitter = new NativeEventEmitter(Shortcuts)

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(rootStore: RootStore, navigationRef: MutableRefObject<NavigationContainerRef<RootParamList>>) {
  const stations = useStations()

  function deepLinkWidgetURL(url: string) {
    if (!rootStore) return

    const { originId, destinationId } = extractURLParams(url)
    const { setOrigin, setDestination } = rootStore.routePlan

    const origin = stations.find((station) => station.id === originId)
    const destination = stations.find((station) => station.id === destinationId)

    setOrigin(origin)
    setDestination(destination)

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
    const { route, originId, destinationId } = rootStore.ride
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
      analytics.logEvent("deep_link_widget")
    }
    if (url.includes("liveActivity")) {
      deepLinkLiveActivity(url)
      analytics.logEvent("deep_link_live_activity")
    }
  }

  function openHomeScreenShortcut(item: ShortcutItem) {
    if (!item) return
    const origin = stations.find((station) => station.id === item.data.originId)
    const destination = stations.find((station) => station.id === item.data.destinationId)

    rootStore.routePlan.setOrigin(origin)
    rootStore.routePlan.setDestination(destination)
    rootStore.routePlan.setDate(new Date())

    // @ts-expect-error navigator type
    navigationRef.current?.navigate("mainStack", {
      screen: "routeList",
      params: {
        originId: origin?.id,
        destinationId: destination?.id,
        time: rootStore?.routePlan.date.getTime(),
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

    if (rootStore) {
      Shortcuts.getInitialShortcut().then(openHomeScreenShortcut)
      shortcutsListener = ShortcutsEmitter.addListener("onShortcutItemPressed", openHomeScreenShortcut)
    }

    return () => {
      linkingListener?.remove()
      shortcutsListener?.remove()
    }
  }, [rootStore])
}
