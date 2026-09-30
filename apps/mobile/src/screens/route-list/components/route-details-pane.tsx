import { I18nManager, Image, View, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components"
import type { RouteItem } from "@/services/api"
import { RouteDetailsBody, useRouteDetailsData } from "@/screens/route-details/route-details-body"
import { logicalSideInsets } from "@/utils/helpers/safe-area-helpers"
import type { SplitViewSelection } from "@/components/split-view/split-view-store"

const railwayStationIcon = require("../../../../assets/railway-station.png")

/** Identifies a route across refetches, which hand back new objects for the same trains. */
export const routeKey = (route: RouteItem) =>
  route.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()

interface RouteDetailsPaneProps {
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  style?: ViewStyle
}

/**
 * The split view's pane beside the route list: the selected trip's details, as the route details screen shows
 * them. It fills its own column, so it pads the safe-area edges that column reaches.
 */
export function RouteDetailsPane({ selection, showEntireRoute, style }: RouteDetailsPaneProps) {
  const insets = useSafeAreaInsets()
  const sideInsets = logicalSideInsets(insets, I18nManager.isRTL)

  return (
    <View style={[styles.pane, { paddingTop: insets.top }, style]} testID="route-details-pane">
      {selection ? (
        <SelectedRouteDetails
          // Remount per trip so the scroll position and ride button animations start fresh.
          key={routeKey(selection.route)}
          selection={selection}
          showEntireRoute={showEntireRoute}
          sideInsets={sideInsets}
        />
      ) : (
        <View style={[styles.emptyState, { paddingStart: sideInsets.start, paddingEnd: sideInsets.end }]}>
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
  sideInsets,
}: {
  selection: SplitViewSelection
  showEntireRoute: boolean
  sideInsets: { start: number; end: number }
}) {
  const data = useRouteDetailsData(selection.route, selection.originId, selection.destinationId)
  return <RouteDetailsBody data={data} screenName="routeDetails" showEntireRoute={showEntireRoute} sideInsets={sideInsets} />
}

const styles = StyleSheet.create((theme) => ({
  pane: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: theme.colors.dimmer,
  },
  emptyState: {
    flex: 1,
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
