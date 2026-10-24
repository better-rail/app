import { useEffect } from "react"
import { I18nManager, ScrollView, StyleSheet as RNStyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { StyleSheet } from "react-native-unistyles"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import { FavoriteRoutes } from "@/components/favorite-routes/favorite-routes"
import { RouteDetailsPane } from "@/screens/route-list/components/route-details-pane"
import { sideInsetPadding } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore } from "./split-view-store"

/**
 * The split view's secondary column, following the screen the app is on: the selected trip's details beside the
 * route list, and the favorite routes beside the planner, one tap from planning a trip. The two cross-fade as the
 * app moves between the planner and the list, in step with the list's own push and pop.
 */
export function SidePane() {
  const insets = useSafeAreaInsets()
  // Judged by the stack, not the current path: a filter or fares sheet over the list is no reason to swap the pane.
  const isRouteListMounted = useSplitViewStore((s) => s.isRouteListMounted)

  const details = useSharedValue(isRouteListMounted ? 1 : 0)
  useEffect(() => {
    details.value = withTiming(isRouteListMounted ? 1 : 0, { duration: 300 })
  }, [isRouteListMounted, details])
  const detailsStyle = useAnimatedStyle(() => ({ opacity: details.value }))
  const favoritesStyle = useAnimatedStyle(() => ({ opacity: 1 - details.value }))

  return (
    <View style={styles.pane}>
      <Animated.View style={[RNStyleSheet.absoluteFill, favoritesStyle]} pointerEvents={isRouteListMounted ? "none" : "auto"}>
        <ScrollView
          contentContainerStyle={[
            styles.favoritesContent,
            { paddingTop: insets.top + styles.favoritesContent.paddingTop },
            sideInsetPadding(insets, I18nManager.isRTL),
          ]}
        >
          <FavoriteRoutes onSelect={() => HapticFeedback.trigger("impactLight")} />
        </ScrollView>
      </Animated.View>
      <Animated.View style={[RNStyleSheet.absoluteFill, detailsStyle]} pointerEvents={isRouteListMounted ? "auto" : "none"}>
        <RouteDetailsPane />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  pane: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: theme.colors.dimmer,
  },
  // Lines the favorites' heading up with the planner's title, below its header row.
  favoritesContent: {
    paddingTop: 48 + theme.spacing[2],
    paddingBottom: theme.spacing[5],
  },
}))
