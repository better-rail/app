import { useEffect, useState } from "react"
import { I18nManager, ScrollView, StyleSheet as RNStyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { StyleSheet } from "react-native-unistyles"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import { FavoriteRoutes } from "@/components/favorite-routes/favorite-routes"
import { RouteDetailsPane } from "@/screens/route-list/components/route-details-pane"
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
  // Only the favorites fade, over the details: a glass view under an ancestor at opacity 0 never renders, even mounted
  // after the fade (the ride buttons beside the list).
  const favoritesStyle = useAnimatedStyle(() => ({ opacity: 1 - details.value }))

  return (
    <View style={styles.pane}>
      {detailsMounted && (
        <View style={RNStyleSheet.absoluteFill} pointerEvents={isRouteListMounted ? "auto" : "none"}>
          <RouteDetailsPane />
        </View>
      )}
      <Animated.View
        style={[RNStyleSheet.absoluteFill, styles.favorites, favoritesStyle]}
        pointerEvents={isRouteListMounted ? "none" : "auto"}
      >
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
  // Opaque, so it covers the details as it fades in over them.
  favorites: {
    backgroundColor: theme.colors.background,
  },
  // Lines the favorites' heading up with the planner's title, below its header row.
  favoritesContent: {
    paddingTop: 48 + theme.spacing[2],
    paddingBottom: theme.spacing[5],
  },
}))
