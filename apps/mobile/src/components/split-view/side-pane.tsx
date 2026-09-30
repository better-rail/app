import { I18nManager, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import { useShallow } from "zustand/react/shallow"
import { FavoriteRoutes } from "@/components/favorite-routes/favorite-routes"
import { RouteDetailsPane } from "@/screens/route-list/components/route-details-pane"
import { sideInsetPadding } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore } from "./split-view-store"

/**
 * The split view's secondary column, following the screen the app is on: the favorite routes beside the planner,
 * one tap from planning a trip, and the selected trip's details beside the route list.
 */
export function SidePane() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { selection, showEntireRoute } = useSplitViewStore(
    useShallow((s) => ({ selection: s.selection, showEntireRoute: s.showEntireRoute })),
  )

  if (pathname.startsWith("/route-list") || pathname.startsWith("/route-details")) {
    return <RouteDetailsPane selection={selection} showEntireRoute={showEntireRoute} />
  }

  return (
    <View style={styles.pane}>
      <ScrollView
        contentContainerStyle={[
          styles.favoritesContent,
          { paddingTop: insets.top + styles.favoritesContent.paddingTop },
          sideInsetPadding(insets, I18nManager.isRTL),
        ]}
      >
        <FavoriteRoutes onSelect={() => HapticFeedback.trigger("impactLight")} />
      </ScrollView>
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
