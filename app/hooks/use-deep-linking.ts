import { MutableRefObject, useEffect } from "react"
import { EmitterSubscription, Linking, Platform } from "react-native"
import { extractURLParams } from "../utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "../utils/ios-helpers"
import { RootStore } from "../models"
import { PrimaryParamList, RootParamList } from "../navigators"
import { NavigationContainerRef } from "@react-navigation/native"
import { isEqual } from "lodash"
import analytics from "@react-native-firebase/analytics"

/**
 * Handles navigation of deep links provided to the app.
 */
export function useDeepLinking(rootStore: RootStore, navigationRef: MutableRefObject<NavigationContainerRef<RootParamList>>) {
  function deepLinkWidgetURL(url: string) {
    const { originId, destinationId } = extractURLParams(url)
    donateRouteIntent(originId, destinationId)

    // @ts-expect-error navigator type
    navigationRef.current?.navigate("routeList", {
      originId,
      destinationId,
      time: new Date().getTime(),
      enableQuery: true,
    })

    // reload widget timeline
    reloadAllTimelines()
  }

  function openActiveRideScreen() {
    const { route, originId, destinationId } = rootStore.ride

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
      analytics().logEvent("deep_link_widget")
    }
    if (url.includes("liveActivity")) {
      deepLinkLiveActivity(url)
      analytics().logEvent("deep_link_live_activity")
    }
  }

  useEffect(() => {
    let linkingListener: EmitterSubscription

    if (Platform.OS === "ios") {
      Linking.getInitialURL().then(handleDeepLinkURL)

      linkingListener = Linking.addEventListener("url", ({ url }) => {
        handleDeepLinkURL(url)
      })
    }

    if (linkingListener !== undefined) {
      return () => linkingListener.remove()
    }

    return undefined
  }, [rootStore])
}
