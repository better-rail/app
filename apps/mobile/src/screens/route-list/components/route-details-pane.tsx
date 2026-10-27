import { I18nManager, Image, Platform, StyleSheet as RNStyleSheet, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScreenStack, ScreenStackItem, type HeaderBarButtonItem } from "react-native-screens"
import HapticFeedback from "react-native-haptic-feedback"
import { useShallow } from "zustand/react/shallow"
import { RouteDetailsHeader, Text } from "@/components"
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
 * The split view's details column: the selected trip, as the route details screen shows it. Beside the list on wide
 * layouts, and the screen the list pushes on phones, where the split view is collapsed — so it carries the details
 * screen's test id, and its own stack bar holds the back button and the trip's actions, which the system lays out in
 * iPhone Duo's vertical bar as it does the list's.
 */
export function RouteDetailsPane() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { selection, showEntireRoute, setShowEntireRoute, showList } = useSplitViewStore(
    useShallow((s) => ({
      selection: s.selection,
      showEntireRoute: s.showEntireRoute,
      setShowEntireRoute: s.setShowEntireRoute,
      showList: s.showList,
    })),
  )
  const sideInsets = logicalSideInsets(insets, I18nManager.isRTL)

  // Shown only while the column is pushed over the list. React hears of the split view collapsing only after the
  // closed display is on screen, so the item is always passed and the split view shows or hides it itself, as it
  // collapses and expands (see the react-native-screens patch).
  const backItem: HeaderBarButtonItem[] = [
    {
      type: "button",
      identifier: "collapsed-split-only.back",
      icon: { type: "sfSymbol", name: "chevron.backward" },
      sharesBackground: false,
      onPress: showList,
    },
  ]
  // The same actions the route details screen offers from its bar (see RouteDetailsHeader). The bar has room, so the
  // most used are buttons of their own, each with its own background, and only the rest sit behind the menu. The
  // identifiers keep the bar from animating the items in afresh each time they're set.
  const actionItems: HeaderBarButtonItem[] = selection
    ? [
        {
          type: "button",
          identifier: "share",
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
          identifier: "show-entire-route",
          title: translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations") ?? "",
          icon: { type: "sfSymbol", name: showEntireRoute ? "rectangle.compress.vertical" : "rectangle.expand.vertical" },
          sharesBackground: false,
          onPress: () => setShowEntireRoute((prev) => !prev),
        },
        {
          type: "menu",
          identifier: "route-actions",
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
      setShowEntireRoute={setShowEntireRoute}
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
          headerLeftBarButtonItems: backItem,
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
  setShowEntireRoute,
  sideInsets,
}: {
  selection: SplitViewSelection
  showEntireRoute: boolean
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
  sideInsets: { start: number; end: number }
}) {
  const data = useRouteDetailsData(selection.route, selection.originId, selection.destinationId)
  return (
    <View style={styles.pane} testID="route-details-screen">
      <CollapsedSplitHeader>
        <RouteDetailsHeader
          routeItem={data.routeItem}
          originId={selection.originId}
          destinationId={selection.destinationId}
          screenName="routeDetails"
          inSplitColumn
          showEntireRoute={showEntireRoute}
          setShowEntireRoute={setShowEntireRoute}
          style={styles.headerContainer}
        />
      </CollapsedSplitHeader>
      {/* No layout transition here: the live ride sheet below is positioned absolutely and entering animations on
          it (and the Start Ride button) take their frame from the wrong layout pass under one. */}
      <RouteDetailsBody data={data} screenName="routeDetails" showEntireRoute={showEntireRoute} sideInsets={sideInsets} />
    </View>
  )
}

/**
 * The photo header, shown while the column is pushed over the list: beside it the header would double the list's own,
 * and the rows only start below the top inset, where the status bar is on an open display. It comes and goes with the
 * display the column is laid out for, so as the device closes it has to be in place by the closed display's first
 * frame. The header stays mounted, its photo loaded, and beside the list it's only clipped to no height (`display:
 * "none"` would take its native views away, to be made and the photo loaded again as it shows), in a component of its
 * own that alone re-renders.
 */
function CollapsedSplitHeader({ children }: { children: React.ReactNode }) {
  const isCollapsed = useSplitViewStore((s) => s.isCollapsed)
  const insets = useSafeAreaInsets()
  return (
    <>
      <View style={!isCollapsed && styles.clipped}>{children}</View>
      {!isCollapsed && <View style={{ height: insets.top + spacing[3] }} />}
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  pane: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  clipped: {
    height: 0,
    overflow: "hidden",
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
