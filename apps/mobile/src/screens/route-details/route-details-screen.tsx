import React, { useEffect, useState } from "react"
import { I18nManager, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useNavigation } from "expo-router"
import { RouteDetailsHeader, Screen, WebsiteHandoff } from "@/components"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore } from "@/components/split-view/split-view-store"
import { RouteDetailsBody, useRouteDetailsData } from "./route-details-body"

/**
 * A trip's details as a screen of its own: the active ride's modal, and the route list's details on phones and the
 * closed iPhone Duo. Where the split view has room, the list shows them in its details column instead (see
 * `RouteDetailsPane`). `screenName` is passed by the route file, since usePathname() follows whichever sheet is
 * focused on top.
 */
export function RouteDetailsScreen({ screenName = "routeDetails" }: { screenName?: "routeDetails" | "activeRide" }) {
  const {
    routeItem: paramsRouteItem,
    originId,
    destinationId,
  } = useNavigationParamsStore(
    useShallow((s) => ({ routeItem: s.routeItem, originId: s.originId, destinationId: s.destinationId })),
  )
  const data = useRouteDetailsData(paramsRouteItem, originId, destinationId)
  const { routeItem } = data
  const insets = useSafeAreaInsets()
  const [showEntireRoute, setShowEntireRoute] = useState(false)

  // Carried over from the details column as the device closed, the screen came in without its push animation; once
  // in place it goes back to the stack's own, so going back still slides.
  const navigation = useNavigation()
  const { handoff } = useLocalSearchParams<{ handoff?: string }>()
  useEffect(() => {
    if (handoff !== "true") return
    const nav = navigation as unknown as { addListener: (event: "transitionEnd", cb: () => void) => () => void }
    return nav.addListener("transitionEnd", () => navigation.setOptions({ animation: "default" }))
  }, [handoff, navigation])

  // Opening the device moves the trip to the split view's details column beside the list, in place.
  const isSplitExpanded = useSplitViewStore((s) => !s.isCollapsed)
  useEffect(() => {
    if (Platform.OS !== "ios" || screenName !== "routeDetails" || !isSplitExpanded) return
    if (!paramsRouteItem || !originId || !destinationId) return
    const { showDetails, setShowEntireRoute: setPaneShowEntireRoute } = useSplitViewStore.getState()
    showDetails({ route: paramsRouteItem, originId, destinationId })
    setPaneShowEntireRoute(showEntireRoute)
    navigation.setOptions({ animation: "none" })
    navigation.goBack()
  }, [isSplitExpanded, screenName, paramsRouteItem, originId, destinationId, showEntireRoute, navigation])

  return (
    <Screen
      testID="route-details-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      edgeToEdge
      keyboardAvoiding={false}
      statusBar="light-content"
    >
      {routeItem && originId && destinationId && (
        <WebsiteHandoff
          originId={originId}
          destinationId={destinationId}
          time={routeItem.departureTime}
          trainNumbers={routeItem.trains.map((train) => train.trainNumber)}
          viaStationId={routeItem.viaStationId}
        />
      )}
      <View style={{ flex: 1 }}>
        <RouteDetailsHeader
          routeItem={routeItem}
          originId={originId}
          destinationId={destinationId}
          screenName={screenName}
          showEntireRoute={showEntireRoute}
          setShowEntireRoute={setShowEntireRoute}
          style={styles.headerContainer}
        />

        <RouteDetailsBody
          data={data}
          screenName={screenName}
          showEntireRoute={showEntireRoute}
          sideInsets={logicalSideInsets(insets, I18nManager.isRTL)}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
}))
