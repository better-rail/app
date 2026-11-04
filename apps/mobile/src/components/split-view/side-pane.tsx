import { useEffect, useState } from "react"
import { I18nManager, Platform, ScrollView, StyleSheet as RNStyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { StyleSheet } from "react-native-unistyles"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScreenStack, ScreenStackItem } from "react-native-screens"
import HapticFeedback from "react-native-haptic-feedback"
import { usePathname, useRouter } from "expo-router"
import { useRoutePlanStore } from "@/models"
import { donateRouteIntent } from "@/utils/ios-helpers"
import { FavoriteRoutes } from "@/components/favorite-routes/favorite-routes"
import { RouteDetailsPane } from "@/screens/route-list/components/route-details-pane"
import { usePlannerBarButtonItems } from "@/screens/planner/planner-screen-header"
import { sideInsetPadding } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore } from "./split-view-store"

const FADE_DURATION = 300

/**
 * The split view's secondary column, following the screen the app is on: the selected trip's details beside the
 * route list, and the favorite routes beside the planner, one tap from planning a trip. The two cross-fade as the
 * app moves between the planner and the list, in step with the list's own push and pop.
 */
export function SidePane() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  // Judged by the stack, not the current path: a filter or fares sheet over the list is no reason to swap the pane.
  const isRouteListMounted = useSplitViewStore((s) => s.isRouteListMounted)

  const details = useSharedValue(isRouteListMounted ? 1 : 0)
  // The details column stays mounted only through its fade-out: its bar items are the rail's while it's mounted.
  const [detailsMounted, setDetailsMounted] = useState(isRouteListMounted)
  useEffect(() => {
    details.value = withTiming(isRouteListMounted ? 1 : 0, { duration: FADE_DURATION })
    if (isRouteListMounted) {
      setDetailsMounted(true)
      return
    }
    const timeout = setTimeout(() => setDetailsMounted(false), FADE_DURATION)
    return () => clearTimeout(timeout)
  }, [isRouteListMounted, details])
  // Likewise the favorites' bar, with the planner's actions, while they're on screen.
  const [favoritesMounted, setFavoritesMounted] = useState(!isRouteListMounted)
  useEffect(() => {
    if (!isRouteListMounted) {
      setFavoritesMounted(true)
      return
    }
    const timeout = setTimeout(() => setFavoritesMounted(false), FADE_DURATION)
    return () => clearTimeout(timeout)
  }, [isRouteListMounted])
  // Only the favorites fade, over the details: a glass view under an ancestor at opacity 0 never renders, even mounted
  // after the fade (the ride buttons beside the list).
  const favoritesStyle = useAnimatedStyle(() => ({ opacity: 1 - details.value }))

  // Beside the planner itself, a favorite is a trip to plan, so it opens its route list as Find Routes would. Beside a
  // screen over the planner (the station picker), it only fills in the stations.
  const onFavoriteSelect = () => {
    HapticFeedback.trigger("impactLight")
    if (pathname !== "/") return

    const { origin, destination, date } = useRoutePlanStore.getState()
    if (!origin || !destination) return
    donateRouteIntent(origin.id, destination.id)
    router.push({
      pathname: "/route-list",
      params: { originId: origin.id, destinationId: destination.id, time: String(date.getTime()), enableQuery: "true" },
    })
  }

  return (
    <View style={styles.pane}>
      {detailsMounted && (
        <View style={RNStyleSheet.absoluteFill} pointerEvents={isRouteListMounted ? "auto" : "none"}>
          <RouteDetailsPane />
        </View>
      )}
      {favoritesMounted && (
        <View style={RNStyleSheet.absoluteFill} pointerEvents={isRouteListMounted ? "none" : "auto"}>
          <PlannerActionsBar>
            <Animated.View style={[RNStyleSheet.absoluteFill, styles.favorites, favoritesStyle]}>
              <ScrollView
                contentContainerStyle={[
                  styles.favoritesContent,

                  sideInsetPadding(insets, I18nManager.isRTL),
                ]}
              >
                <FavoriteRoutes onSelect={onFavoriteSelect} />
              </ScrollView>
            </Animated.View>
          </PlannerActionsBar>
        </View>
      )}
    </View>
  )
}

/**
 * The planner's actions, beside the favorites: in a stack bar of the column's own, which iPhone Duo lays out in its
 * side bar as it does with the planner's on the closed display (the planner hides its own here, see
 * PlannerScreenHeader). Outside the fade, as glass under a faded ancestor never renders.
 */
function PlannerActionsBar({ children }: { children: React.ReactNode }) {
  const items = usePlannerBarButtonItems()
  if (Platform.OS !== "ios") return <>{children}</>

  return (
    <ScreenStack style={RNStyleSheet.absoluteFill}>
      <ScreenStackItem
        screenId="planner-actions-pane"
        activityState={2}
        style={RNStyleSheet.absoluteFill}
        headerConfig={{
          title: "",
          translucent: true,
          backgroundColor: "transparent",
          hideShadow: true,
          headerRightBarButtonItems: items,
        }}
      >
        {children}
      </ScreenStackItem>
    </ScreenStack>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  pane: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: theme.colors.dimmer,
  },
  // Opaque, so it covers the details as it fades in over them.
  favorites: {
    backgroundColor: theme.colors.background,
  },
  // Under the column's empty bar (its items are in iPhone Duo's side bar), level with the planner's title.
  favoritesContent: {
    paddingTop: rt.insets.top + theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
}))
