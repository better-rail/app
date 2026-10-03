import React, { useEffect, useRef, useState } from "react"
import { I18nManager, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { usePathname, useNavigation, useRouter, useIsFocused } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RouteDetailsHeader, Screen } from "@/components"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore } from "@/components/split-view/split-view-store"
import { routeKey } from "@/screens/route-list/components/route-details-pane"
import { RouteDetailsBody, useRouteDetailsData } from "./route-details-body"

export function RouteDetailsScreen() {
  const pathname = usePathname()
  const screenName = pathname.includes("active-ride") ? "activeRide" : "routeDetails"
  const {
    routeItem: paramsRouteItem,
    originId,
    destinationId,
  } = useNavigationParamsStore(
    useShallow((s) => ({ routeItem: s.routeItem, originId: s.originId, destinationId: s.destinationId })),
  )
  const data = useRouteDetailsData(paramsRouteItem, originId, destinationId)
  const insets = useSafeAreaInsets()
  // Opened in place of the split view's pane as the device closes, the screen keeps the pane's full-route view.
  const [showEntireRoute, setShowEntireRoute] = useState(() => {
    const { selection, showEntireRoute: paneShowsEntireRoute } = useSplitViewStore.getState()
    return !!selection && !!paramsRouteItem && routeKey(selection.route) === routeKey(paramsRouteItem) && paneShowsEntireRoute
  })

  // Opened from the route list, this screen shows what the split view's pane shows beside the list once the split
  // view expands (the device opens or rotates). Hand the trip to the pane then and leave without a transition, so
  // the layout simply changes under the user.
  const router = useRouter()
  const navigation = useNavigation()
  const isSplitExpanded = useSplitViewStore((s) => s.isExpanded)
  const isFocused = useIsFocused()
  const wasExpanded = useRef(isSplitExpanded)
  useEffect(() => {
    const expanded = !wasExpanded.current && isSplitExpanded
    wasExpanded.current = isSplitExpanded
    if (!expanded || screenName !== "routeDetails" || !isFocused) return
    const { routes, index } = navigation.getState() ?? { routes: [], index: 0 }
    if (routes[index - 1]?.name !== "route-list") return
    useSplitViewStore.getState().setSelection({ route: data.routeItem, originId, destinationId })
    useSplitViewStore.getState().setShowEntireRoute(showEntireRoute)
    navigation.setOptions({ animation: "none" })
    router.back()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplitExpanded])

  return (
    <Screen
      testID="route-details-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      edgeToEdge
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <View style={{ flex: 1 }}>
        <RouteDetailsHeader
          routeItem={data.routeItem}
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
