import { MutableRefObject, useEffect } from "react"
import { EmitterSubscription, Linking, Platform } from "react-native"
import { extractURLParams } from "../utils/helpers/url"
import { donateRouteIntent, reloadAllTimelines } from "../utils/ios-helpers"
import { RootStore } from "../models"
import { RootParamList } from "../navigators"
import { NavigationContainerRef } from "@react-navigation/native"

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
  function openActiveRide() {
    const { route, originId, destinationId } = rootStore.ride

    const screenName = navigationRef.current?.getCurrentRoute().name
    if (screenName != "routeDetails") {
      // @ts-expect-error navigator type
      navigationRef.current?.navigate("activeRideStack", {
        screen: "activeRide",
        params: { routeItem: route, originId: originId, destinationId: destinationId },
      })
    }
  }

  function handleDeepLinkURL(url: string) {
    if (!url) return
    if (url.includes("widget")) deepLinkWidgetURL(url)
    if (url.includes("liveActivity")) openActiveRide()
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
