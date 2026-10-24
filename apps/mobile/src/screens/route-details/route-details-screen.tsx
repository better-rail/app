import React, { useEffect, useRef, useState } from "react"
import { I18nManager, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { usePathname, useNavigation, useRouter, useIsFocused, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RouteDetailsHeader, Screen } from "@/components"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { useIsWideLayout } from "@/hooks/use-is-wide-layout"
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
  const [showEntireRoute, setShowEntireRoute] = useState(false)

  // Opened from the route list, this screen stands in for its split view while the window is narrow. When the
  // window widens (the device opens or rotates), hand the trip back for the split to show and leave without a
  // transition, so the layout simply changes under the user.
  const router = useRouter()
  const navigation = useNavigation()
  const isWide = useIsWideLayout()
  const isFocused = useIsFocused()
  const wasWide = useRef(isWide)
  // While the hand-off is under way the body is covered: for the frames until the pop lands this screen is laid out
  // across the whole wide window, and the stretched rows would show before the split takes over.
  const [handingOff, setHandingOff] = useState(false)
  useEffect(() => {
    const widened = !wasWide.current && isWide
    wasWide.current = isWide
    if (!widened || screenName !== "routeDetails" || !isFocused) return
    const { routes, index } = navigation.getState() ?? { routes: [], index: 0 }
    if (routes[index - 1]?.name !== "route-list") return
    setHandingOff(true)
    useNavigationParamsStore.getState().setSplitHandoff(data.routeItem)
    // The option reaches the native screen with the next commit; popping in the same tick still animates.
    navigation.setOptions({ animation: "none" })
    const timeout = setTimeout(() => router.back(), 0)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWide])

  // Swapped in without animation (see the stack's options), the screen goes back to the default one once it's up, so
  // the back button pops it like any other screen.
  const { instant } = useLocalSearchParams<{ instant?: string }>()
  useEffect(() => {
    if (!instant) return
    const timeout = setTimeout(() => navigation.setOptions({ animation: "default" }), 300)
    return () => clearTimeout(timeout)
  }, [instant, navigation])

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

        <View style={{ flex: 1 }}>
          <RouteDetailsBody
            data={data}
            screenName={screenName}
            showEntireRoute={showEntireRoute}
            sideInsets={logicalSideInsets(insets, I18nManager.isRTL)}
          />
          {handingOff && <View style={styles.handoffCover} />}
        </View>
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
  handoffCover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
  },
}))
