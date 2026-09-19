import { Image, View, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import type { RouteItem } from "@/services/api"
import { RouteDetailsBody, useRouteDetailsData } from "@/screens/route-details/route-details-body"

const railwayStationIcon = require("../../../../assets/railway-station.png")

/** Identifies a route across refetches, which hand back new objects for the same trains. */
export const routeKey = (route: RouteItem) =>
  route.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()

interface RouteDetailsPaneProps {
  routeItem: RouteItem | null
  originId: string
  destinationId: string
  showEntireRoute: boolean
  /** The logical end inset (e.g. iPhone Duo's side bar column), which the pane's content keeps clear of. */
  endInset: number
  style?: ViewStyle
}

/** The route list's second column on wide layouts: the selected trip's details, as the route details screen shows them. */
export function RouteDetailsPane({
  routeItem,
  originId,
  destinationId,
  showEntireRoute,
  endInset,
  style,
}: RouteDetailsPaneProps) {
  return (
    <View style={[styles.pane, style]} testID="route-details-pane">
      {routeItem ? (
        <SelectedRouteDetails
          // Remount per trip so the scroll position and ride button animations start fresh.
          key={routeKey(routeItem)}
          routeItem={routeItem}
          originId={originId}
          destinationId={destinationId}
          showEntireRoute={showEntireRoute}
          endInset={endInset}
        />
      ) : (
        <View style={[styles.emptyState, { paddingEnd: endInset }]}>
          <Image source={railwayStationIcon} style={styles.emptyIcon} />
          <Text tx="routeDetails.selectRoute" style={styles.emptyText} />
        </View>
      )}
    </View>
  )
}

function SelectedRouteDetails({
  routeItem,
  originId,
  destinationId,
  showEntireRoute,
  endInset,
}: Omit<RouteDetailsPaneProps, "routeItem" | "style"> & { routeItem: RouteItem }) {
  const data = useRouteDetailsData(routeItem, originId, destinationId)
  return (
    <RouteDetailsBody
      data={data}
      screenName="routeDetails"
      showEntireRoute={showEntireRoute}
      sideInsets={{ start: 0, end: endInset }}
      // Beside the list, the rows stop at the toolbar column rather than running under it.
      bleedUnderInsets={false}
    />
  )
}

const styles = StyleSheet.create((theme) => ({
  pane: {
    flex: 1,
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
