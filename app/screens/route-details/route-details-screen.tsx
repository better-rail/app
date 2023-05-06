/* eslint-disable react-native/no-inline-styles */
import React from "react"
import { observer } from "mobx-react-lite"
import { Alert, Dimensions, Image, ImageStyle, Platform, TextStyle, View, ViewStyle } from "react-native"
import { Button, RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { differenceInMinutes, format, isAfter } from "date-fns"
import { RouteStationCard, RouteStopCard, RouteExchangeDetails } from "./components"

import { isRTL, translate } from "../../i18n"
import { useStores } from "../../models"
import { timezoneCorrection } from "../../utils/helpers/date-helpers"
import { LiveRideSheet } from "./components/live-ride-sheet"

const { width: deviceWidth } = Dimensions.get("screen")

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

const START_RIDE_BUTTON: ViewStyle = {
  backgroundColor: color.primaryDarker,
  width: 148,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 3,
  shadowColor: "#000",
  elevation: 4,
}

const TRAIN_ICON: ImageStyle = {
  width: 22.5,
  height: 22.5,
  tintColor: "white",
  transform: [{ rotateY: isRTL ? "180deg" : "0deg" }],
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { routeItem } = route.params
  const { ride } = useStores()
  const insets = useSafeAreaInsets()

  /**
   * Check if the ride is 60 minutes away or less from now, and not after the arrival time.
   * We are also correcting the user's timezone to Asia/Jerusalem, so if foreign users are playing with the
   * feature, it'll allow them to start a ride as if they were at Israel at the moment.
   */
  const isRouteInPast = isAfter(timezoneCorrection(new Date()).getTime(), routeItem.arrivalTime)
  const isRouteInFuture = differenceInMinutes(routeItem.departureTime, timezoneCorrection(new Date()).getTime()) > 60

  const activeRide = !!ride.id
  const isStartRideButtonDisabled = isRouteInFuture || isRouteInPast || activeRide
  const isRideOnThisRoute = ride.isRouteActive(routeItem)

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

              {train.stopStations.length > 0
                ? train.stopStations.map((stop, index) => (
                    <View key={stop.stationId}>
                      {index === 0 && <RouteLine />}
                      <RouteStopCard
                        stationName={stop.stationName}
                        stopTime={format(stop.departureTime, "HH:mm")}
                        delayedTime={train.delay ? format(stop.departureTime + train.delay * 60000, "HH:mm") : undefined}
                        style={{ zIndex: 20 - index }}
                      />
                      {train.stopStations.length - 1 === index && <RouteLine />}
                    </View>
                  ))
                : train.stopStations.length === 0 && <RouteLine height={30} />}

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

      <LiveRideSheet />

      {/* Hide "Start Ride" option on tablets */}
      {deviceWidth < 768 && route.name === "routeDetails" && (
        <View style={{ position: "absolute", bottom: insets.bottom > 0 ? insets.bottom + 5 : 15, right: 15 + insets.right }}>
          {/* Check if the ride is already started and belongs to the current route */}
          {isRideOnThisRoute ? (
            <Button
              style={START_RIDE_BUTTON}
              title={translate("ride.stopRide")}
              icon={
                Platform.OS == "android" ? undefined : (
                  <Image source={require("../../../assets/stop.ios.png")} style={TRAIN_ICON} />
                )
              }
              pressedOpacity={0.85}
              onPress={() => {
                ride.stopRide(ride.id)
              }}
            />
          ) : (
            <Button
              style={{ backgroundColor: color.secondary, width: 148 }}
              icon={
                Platform.OS == "android" ? undefined : (
                  <Image source={require("../../../assets/train.ios.png")} style={TRAIN_ICON} />
                )
              }
              pressedOpacity={0.85}
              title={translate("ride.startRide")}
              loading={ride.loading}
              disabled={isStartRideButtonDisabled}
              onDisabledPress={() => {
                let message = ""
                if (activeRide) {
                  message = translate("ride.activeRideAlert")
                } else if (isRouteInPast) {
                  message = translate("ride.rideInPastAlert")
                } else if (isRouteInFuture) {
                  message = translate("ride.rideInFutureAlert")
                }

                Alert.alert(message)
              }}
              onPress={() => ride.startRide(routeItem)}
            />
          )}
        </View>
      )}
    </Screen>
  )
})

const RouteLine = ({ height = 10 }: { height?: number }) => (
  <View style={{ start: "35.44%", width: 4, height, backgroundColor: color.separator, zIndex: 0 }} />
)

const LONG_ROUTE_WARNING_WRAPPER: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing[4],
  backgroundColor: color.secondary,
  width: "100%",
}

const LONG_ROUTE_WARNING_TITLE: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
}
const LONG_ROUTE_WARNING_TEXT: TextStyle = {
  paddingHorizontal: spacing[5],
  marginBottom: spacing[3],
  textAlign: "center",
}

const LongRouteWarning = () => (
  <View style={LONG_ROUTE_WARNING_WRAPPER}>
    <Text style={{ fontSize: 48 }}>🕰</Text>
    <Text style={LONG_ROUTE_WARNING_TITLE} tx="routeDetails.routeWarning" />
    <Text style={LONG_ROUTE_WARNING_TEXT} tx="routeDetails.routeWarningText" />
  </View>
)
