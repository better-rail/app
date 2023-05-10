/* eslint-disable react-native/no-inline-styles */
import React from "react"
import { observer } from "mobx-react-lite"
import { OpaqueColorValue, View, ViewStyle } from "react-native"
import { RouteDetailsHeader, Screen } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { RouteStationCard, RouteStopCard, RouteExchangeDetails } from "./components"

import { useStores } from "../../models"
import { LiveRideSheet } from "./components/live-ride-sheet"
import { LongRouteWarning } from "./components/long-route-warning"
import { StartRideButton } from "./components/start-ride-button"
import { useRideProgress } from "../../hooks/use-ride-progress"
import { RouteDetailsLiveRoute } from "./route-details-live-stations"
import { RouteDetailsStaticRoute } from "./route-details-static-route"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { routeItem } = route.params
  const { ride } = useStores()
  console.log(ride.id)
  const isRideOnThisRoute = ride.isRouteActive(routeItem)

  const progress = useRideProgress({ route: routeItem, enabled: isRideOnThisRoute })

  const insets = useSafeAreaInsets()

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <SharedElement id="route-header">
        <RouteDetailsHeader
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          screenName={route.name}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </SharedElement>

      <ScrollView
        contentContainerStyle={{ paddingTop: spacing[4], paddingBottom: 80 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {routeItem.isMuchLonger && route.name == "routeDetails" && <LongRouteWarning />}
        {routeItem.trains.map((train, index) => {
          return (
            <View key={train.trainNumber} style={{ backgroundColor: color.background }}>
              <RouteStationCard
                stationName={train.originStationName}
                stopTime={format(train.departureTime, "HH:mm")}
                platform={train.originPlatform}
                trainNumber={train.trainNumber}
                lastStop={train.lastStop}
                delay={train.delay}
              />

              {isRideOnThisRoute ? (
                <RouteDetailsStaticRoute train={train} />
              ) : (
                <RouteDetailsLiveRoute train={train} stations={progress.stations} />
              )}
              <RouteStationCard
                stationName={train.destinationStationName}
                stopTime={format(train.arrivalTime, "HH:mm")}
                delayedTime={train.delay > 0 ? format(train.arrivalTime + train.delay * 60000, "HH:mm") : undefined}
                platform={train.destinationPlatform}
              />

              {routeItem.isExchange && routeItem.trains.length - 1 !== index && (
                <RouteExchangeDetails
                  stationName={train.destinationStationName}
                  arrivalPlatform={train.destinationPlatform}
                  departurePlatform={routeItem.trains[index + 1].originPlatform}
                  arrivalTime={train.arrivalTime}
                  depatureTime={routeItem.trains[index + 1].departureTime}
                />
              )}
            </View>
          )
        })}
      </ScrollView>

      {isRideOnThisRoute ? (
        <LiveRideSheet progress={progress} ride={ride} />
      ) : (
        <StartRideButton route={routeItem} ride={ride} screenName={route.name} />
      )}
    </Screen>
  )
})

export type RouteLineStateType = "idle" | "inProgress" | "passed"

const ROUTE_LINE_STATE_COLORS = {
  idle: color.separator,
  passed: color.greenText,
}

export const RouteLine = ({ height = 10, state = "idle" }: { height?: number; state: "idle" | "inProgress" | "passed" }) => (
  <View style={{ start: "35.44%", width: 4, height, backgroundColor: ROUTE_LINE_STATE_COLORS[state], zIndex: 0 }} />
)
