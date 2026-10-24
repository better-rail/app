import { I18nManager, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShallow } from "zustand/react/shallow"
import { RouteDetailsHeader, Text } from "@/components"
import type { RouteItem } from "@/services/api"
import { RouteDetailsBody, useRouteDetailsData } from "@/screens/route-details/route-details-body"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import { useSplitViewStore, type SplitViewSelection } from "@/components/split-view/split-view-store"

const railwayStationIcon = require("../../../../assets/railway-station.png")

/** Identifies a route across refetches, which hand back new objects for the same trains. */
export const routeKey = (route: RouteItem) =>
  route.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()

/**
 * The split view's details column: the selected trip, as the route details screen shows it. Beside the list on wide
 * layouts, and the screen the list pushes on phones, where the split view is collapsed — so it carries the details
 * screen's test id.
 */
export function RouteDetailsPane() {
  const insets = useSafeAreaInsets()
  const { selection, showEntireRoute, setShowEntireRoute } = useSplitViewStore(
    useShallow((s) => ({ selection: s.selection, showEntireRoute: s.showEntireRoute, setShowEntireRoute: s.setShowEntireRoute })),
  )
  const sideInsets = logicalSideInsets(insets, I18nManager.isRTL)

  return (
    <View style={styles.pane}>
      {selection ? (
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
      )}
    </View>
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
      <RouteDetailsBody data={data} screenName="routeDetails" showEntireRoute={showEntireRoute} sideInsets={sideInsets} />
    </View>
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
