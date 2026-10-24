import { I18nManager, Image, Platform, StyleSheet as RNStyleSheet, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScreenStack, ScreenStackItem, type HeaderBarButtonItem } from "react-native-screens"
import HapticFeedback from "react-native-haptic-feedback"
import { useShallow } from "zustand/react/shallow"
import { Text } from "@/components"
import { createContextMenuActions } from "@/components/route-card/route-context-menu-actions"
import { translate } from "@/i18n"
import { spacing } from "@/theme"
import type { RouteItem } from "@/services/api"
import { RouteDetailsBody, useRouteDetailsData } from "@/screens/route-details/route-details-body"
import { addRouteToCalendar } from "@/utils/helpers/calendar-helpers"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore, type SplitViewSelection } from "@/components/split-view/split-view-store"

const railwayStationIcon = require("../../../../assets/railway-station.png")

/** Identifies a route across refetches, which hand back new objects for the same trains. */
export const routeKey = (route: RouteItem) =>
  route.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()

/**
 * The split view's details column beside the list: the selected trip, as the route details screen shows it below its
 * header (the list's header already shows the stations). Its own stack bar holds the trip's actions, which the system
 * lays out in iPhone Duo's vertical bar as it does the list's.
 */
export function RouteDetailsPane() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { selection, showEntireRoute, setShowEntireRoute } = useSplitViewStore(
    useShallow((s) => ({
      selection: s.selection,
      showEntireRoute: s.showEntireRoute,
      setShowEntireRoute: s.setShowEntireRoute,
    })),
  )
  const sideInsets = logicalSideInsets(insets, I18nManager.isRTL)

  // The same actions the route details screen offers from its bar (see RouteDetailsHeader). The bar has room, so the
  // most used are buttons of their own, each with its own background, and only the rest sit behind the menu.
  const actionItems: HeaderBarButtonItem[] = selection
    ? [
        {
          type: "button",
          title: translate("routes.share") ?? "",
          icon: { type: "sfSymbol", name: "square.and.arrow.up" },
          sharesBackground: false,
          onPress: () => {
            const share = createContextMenuActions(selection.route, selection.originId, selection.destinationId).find(
              (action) => action.systemIcon === "square.and.arrow.up",
            )
            share?.onPress()
          },
        },
        {
          type: "button",
          title: translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations") ?? "",
          icon: { type: "sfSymbol", name: showEntireRoute ? "rectangle.compress.vertical" : "rectangle.expand.vertical" },
          sharesBackground: false,
          onPress: () => setShowEntireRoute((prev) => !prev),
        },
        {
          type: "menu",
          title: translate("routes.routeActions") ?? "",
          icon: { type: "sfSymbol", name: "ellipsis" },
          sharesBackground: false,
          menu: {
            items: [
              {
                type: "action",
                title: translate("routeDetails.addToCalendar") ?? "",
                icon: { type: "sfSymbol", name: "calendar" },
                onPress: () => {
                  addRouteToCalendar(selection.route).catch((error) => console.error("Failed to add to calendar:", error))
                },
              },
              {
                type: "action",
                title: translate("fares.title") ?? "",
                icon: { type: "sfSymbol", name: "shekelsign.circle" },
                onPress: () => {
                  HapticFeedback.trigger("impactMedium")
                  router.push({
                    pathname: "/fares",
                    params: { originId: selection.originId, destinationId: selection.destinationId },
                  })
                },
              },
            ],
          },
        },
      ]
    : []

  const content = selection ? (
    <SelectedRouteDetails
      // Remount per trip so the scroll position and ride button animations start fresh.
      key={routeKey(selection.route)}
      selection={selection}
      showEntireRoute={showEntireRoute}
      sideInsets={sideInsets}
    />
  ) : (
    <View style={[styles.pane, styles.emptyState, { paddingStart: sideInsets.start, paddingEnd: sideInsets.end }]}>
      <Image source={railwayStationIcon} style={styles.emptyIcon} />
      <Text tx="routeDetails.selectRoute" style={styles.emptyText} />
    </View>
  )

  if (Platform.OS !== "ios") return <View style={styles.pane}>{content}</View>

  return (
    <ScreenStack style={styles.pane}>
      <ScreenStackItem
        screenId="route-details-pane"
        activityState={2}
        style={RNStyleSheet.absoluteFill}
        contentStyle={styles.pane}
        headerConfig={{
          title: "",
          translucent: true,
          backgroundColor: "transparent",
          hideShadow: true,
          headerRightBarButtonItems: actionItems,
        }}
      >
        {content}
      </ScreenStackItem>
    </ScreenStack>
  )
}

function SelectedRouteDetails({
  selection,
  showEntireRoute,
  sideInsets,
}: {
  selection: SplitViewSelection
  showEntireRoute: boolean
  sideInsets: { start: number; end: number }
}) {
  const data = useRouteDetailsData(selection.route, selection.originId, selection.destinationId)
  const insets = useSafeAreaInsets()
  return (
    // Without the photo header the rows start below the top inset, where the status bar is on an open display.
    <View style={[styles.pane, { paddingTop: insets.top + spacing[3] }]} testID="route-details-screen">
      {/* No layout transition here: the live ride sheet below is positioned absolutely and entering animations on
          it (and the Start Ride button) take their frame from the wrong layout pass under one. */}
      <RouteDetailsBody data={data} screenName="routeDetails" showEntireRoute={showEntireRoute} sideInsets={sideInsets} />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  pane: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[6],
  },
  emptyIcon: {
    width: 48,
    height: 48,
    tintColor: theme.colors.dim,
    opacity: 0.6,
  },
  emptyText: {
    maxWidth: 280,
    textAlign: "center",
    color: theme.colors.dim,
  },
}))
