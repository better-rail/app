import React, { useState } from "react"
import { I18nManager, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RouteDetailsHeader, Screen } from "@/components"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { RouteDetailsBody, useRouteDetailsData } from "./route-details-body"

/**
 * A trip's details as a screen of its own: the active ride's modal, and the route list's details on Android. On iOS
 * the list shows them in the split view's details column instead (see `RouteDetailsPane`).
 */
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
  const [showEntireRoute, setShowEntireRoute] = useState(false)

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
