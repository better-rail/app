/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from "react"
import { Image, Platform, PlatformColor, Pressable, View, type ImageStyle, type ViewStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"
import { format } from "date-fns"

import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "../../models"
import { useRideProgress } from "../../hooks/use-ride-progress"
import { color, spacing } from "../../theme"
import { RouteDetailsHeader, Screen } from "../../components"
import {
  LiveRideSheet,
  LongRouteWarning,
  RouteExchangeDetails,
  RouteLine,
  RouteStationCard,
  RouteStopCard,
  StartRideButton,
} from "./components"

import type { RouteItem } from "../../services/api"
import type { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { useStations } from "../../data/stations"
import { calculateDelayedTime } from "../../utils/helpers/date-helpers"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"
import { translate } from "../../i18n"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

const HEADER_CONTAINER: ViewStyle = {
  paddingHorizontal: spacing[3],
  marginBottom: spacing[3],
}

const STATION_CONTAINER: ViewStyle = {
  backgroundColor: color.background,
}

const INFO_BUTTON: ViewStyle = {
  padding: Platform.select({ ios: 14, android: 18 }),
  borderRadius: Platform.select({ ios: 16, android: 6 }),
  overflow: "hidden",
  backgroundColor: isLiquidGlassSupported ? undefined : color.tertiaryBackground,
  elevation: 1,
}

const INFO_BUTTON_ICON: ImageStyle = {
  width: 24,
  height: 24,
  tintColor: color.text,
}

export function RouteDetailsScreen({ route, navigation }: RouteDetailsScreenProps) {
  const {
    rideRoute,
    id: rideId,
    isRouteActive,
    stopRide,
  } = useRideStore(useShallow((s) => ({ rideRoute: s.route, id: s.id, isRouteActive: s.isRouteActive, stopRide: s.stopRide })))
  const canRunLiveActivities = useRideStore((s) => s.canRunLiveActivities)
  const allStations = useStations()

  // we re-run this check every time the ride changes
  const isRideOnThisRoute = useMemo(() => isRouteActive(route.params.routeItem), [rideRoute])

  // if the ride is on this route, we use the ride's route, since it has the latest data
  // otherwise we use the route from the route params
  const routeItem = useMemo(() => {
    if (isRideOnThisRoute) return rideRoute as unknown as RouteItem
    return route.params.routeItem
  }, [isRideOnThisRoute, rideRoute, route.params.routeItem])

  const progress = useRideProgress({ route: routeItem, enabled: isRideOnThisRoute })
  const { stations } = progress

  const insets = useSafeAreaInsets()

  const [shouldFadeRideButton, setShouldFadeRideButton] = useState(false)
  const [showEntireRoute, setShowEntireRoute] = useState(false)

  useEffect(() => {
    // allow button fade only after the view mounts; disable the animation when the view appears initally.
    setShouldFadeRideButton(true)
  }, [])

  useEffect(() => {
    if (rideId && progress.status === "arrived") {
      stopRide(rideId)
    }
  }, [progress.status, rideId])

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <View style={{ flex: 1 }}>
        <Animated.View sharedTransitionTag="route-header">
          <RouteDetailsHeader
            routeItem={routeItem}
            originId={route.params.originId}
            destinationId={route.params.destinationId}
            screenName={route.name}
            showEntireRoute={showEntireRoute}
            setShowEntireRoute={setShowEntireRoute}
            style={HEADER_CONTAINER}
          />
        </Animated.View>

        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingTop: spacing[4], paddingBottom: 80 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            {routeItem.isMuchLonger && route.name == "routeDetails" && <LongRouteWarning />}
            {routeItem.trains.map((train, index) => {
              // When showing the entire route, we need to organize all stations in order
              if (showEntireRoute && train.routeStations && train.routeStations.length > 0) {
                // Get all route stations
                const allRouteStations = train.routeStations
                // Find indices of origin and destination stations
                const originIndex = allRouteStations.findIndex((s) => s.stationId === train.originStationId)
                const destinationIndex = allRouteStations.findIndex((s) => s.stationId === train.destinationStationId)

                return (
                  <View key={train.trainNumber} style={STATION_CONTAINER}>
                    {/* Stations before origin */}
                    {allRouteStations.slice(0, originIndex).map((station, idx) => {
                      const isFirstStation = idx === 0
                      return (
                        <View key={`before-${station.stationId}`}>
                          <RouteStopCard
                            stationName={allStations.find((c) => c.id === station.stationId.toString()).name}
                            stopTime={
                              typeof station.arrivalTime === "string"
                                ? station.arrivalTime
                                : format(new Date(station.arrivalTime), "HH:mm")
                            }
                            delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                            style={{ zIndex: 20 - idx, opacity: 0.7 }}
                            topLineState={isFirstStation ? "hidden" : "idle"}
                            bottomLineState="idle"
                            isOutsideUserJourney={true}
                          />
                        </View>
                      )
                    })}

                    {/* Origin station */}
                    <RouteStationCard
                      stationName={train.originStationName}
                      stopTime={format(train.departureTime, "HH:mm")}
                      platform={train.originPlatform}
                      trainNumber={train.trainNumber}
                      lastStop={train.lastStop}
                      delay={train.delay}
                    />

                    {/* Stations between origin and destination */}
                    {allRouteStations.slice(originIndex + 1, destinationIndex).map((station, idx) => (
                      <View key={`between-${station.stationId}`}>
                        <RouteStopCard
                          stationName={allStations.find((c) => c.id === station.stationId.toString()).name}
                          stopTime={
                            typeof station.arrivalTime === "string"
                              ? station.arrivalTime
                              : format(new Date(station.arrivalTime), "HH:mm")
                          }
                          delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                          style={{ zIndex: 20 - idx }}
                          topLineState={isRideOnThisRoute ? stations[station.stationId]?.top || "idle" : "idle"}
                          bottomLineState={isRideOnThisRoute ? stations[station.stationId]?.bottom || "idle" : "idle"}
                        />
                      </View>
                    ))}

                    {/* Destination station */}
                    <RouteStationCard
                      stationName={train.destinationStationName}
                      stopTime={format(train.arrivalTime, "HH:mm")}
                      delayedTime={calculateDelayedTime(train.arrivalTime, train.delay)}
                      platform={train.destinationPlatform}
                    />

                    {/* Stations after destination */}
                    {allRouteStations.slice(destinationIndex + 1).map((station, idx, arr) => {
                      const isLastStation = idx === arr.length - 1
                      return (
                        <View key={`after-${station.stationId}`}>
                          <RouteStopCard
                            stationName={allStations.find((c) => c.id === station.stationId.toString()).name}
                            stopTime={
                              typeof station.arrivalTime === "string"
                                ? station.arrivalTime
                                : format(new Date(station.arrivalTime), "HH:mm")
                            }
                            delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                            style={{ zIndex: 20 - idx, opacity: 0.7 }}
                            topLineState="idle"
                            bottomLineState={isLastStation ? "hidden" : "idle"}
                            isOutsideUserJourney={true}
                          />
                        </View>
                      )
                    })}

                    {routeItem.isExchange && routeItem.trains.length - 1 !== index && (
                      <RouteExchangeDetails
                        stationName={train.destinationStationName}
                        arrivalPlatform={train.destinationPlatform}
                        departurePlatform={routeItem.trains[index + 1].originPlatform}
                        firstTrain={train}
                        secondTrain={routeItem.trains[index + 1]}
                      />
                    )}
                  </View>
                )
              }

              // Original display logic when not showing entire route
              return (
                <View key={train.trainNumber} style={STATION_CONTAINER}>
                  <RouteStationCard
                    stationName={train.originStationName}
                    stopTime={format(train.departureTime, "HH:mm")}
                    platform={train.originPlatform}
                    trainNumber={train.trainNumber}
                    lastStop={train.lastStop}
                    delay={train.delay}
                  />

                  {train.stopStations.length > 0
                    ? train.stopStations.map((stop, idx) => (
                        <View key={stop.stationId}>
                          <RouteStopCard
                            stationName={stop.stationName}
                            stopTime={format(stop.departureTime, "HH:mm")}
                            delayedTime={calculateDelayedTime(stop.departureTime, train.delay)}
                            style={{ zIndex: 20 - idx }}
                            topLineState={isRideOnThisRoute ? stations[stop.stationId]?.top || "idle" : "idle"}
                            bottomLineState={isRideOnThisRoute ? stations[stop.stationId]?.bottom || "idle" : "idle"}
                          />
                        </View>
                      ))
                    : // if there are no stops, display a separating line between the route station cards
                      train.stopStations.length === 0 && (
                        <RouteLine
                          style={{ start: "35.44%", height: 30 }}
                          // TODO: The line state doesn't work properly
                          state={isRideOnThisRoute ? stations[train.destinationStationId]?.bottom || "idle" : "idle"}
                        />
                      )}

                  <RouteStationCard
                    stationName={train.destinationStationName}
                    stopTime={format(train.arrivalTime, "HH:mm")}
                    delayedTime={calculateDelayedTime(train.arrivalTime, train.delay)}
                    platform={train.destinationPlatform}
                  />

                  {routeItem.isExchange && routeItem.trains.length - 1 !== index && (
                    <RouteExchangeDetails
                      stationName={train.destinationStationName}
                      arrivalPlatform={train.destinationPlatform}
                      departurePlatform={routeItem.trains[index + 1].originPlatform}
                      firstTrain={train}
                      secondTrain={routeItem.trains[index + 1]}
                    />
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>

        {isRideOnThisRoute && (
          <Animated.View
            entering={shouldFadeRideButton && FadeInDown}
            exiting={FadeOutDown}
            // zIndex is needed for Android in order to make the button pressable
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: Platform.select({ ios: 0, android: 1 }) }}
          >
            <LiveRideSheet progress={progress} screenName={route.name} />
          </Animated.View>
        )}

        {(Platform.OS === "android" || canRunLiveActivities) && !isRideOnThisRoute && (
          <Animated.View
            entering={shouldFadeRideButton && FadeInDown.delay(100)}
            exiting={FadeOutDown}
            style={{
              position: "absolute",
              left: 0,
              right: insets.right + 18,
              bottom: Math.max(insets.bottom + 12, 32),
              zIndex: 10,
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <Pressable
              onPress={() => navigation.navigate("routeDetailsTrainInfo", { train: routeItem.trains[0] })}
              accessibilityLabel={translate("routeDetails.trainInformation")}
            >
              <LiquidGlassView
                style={INFO_BUTTON}
                interactive
                effect="regular"
                tintColor={PlatformColor("tertiarySystemBackground")}
              >
                <Image source={require("../../../assets/info.circle.png")} style={INFO_BUTTON_ICON} />
              </LiquidGlassView>
            </Pressable>

            <StartRideButton route={routeItem} screenName={route.name} />
          </Animated.View>
        )}
      </View>
    </Screen>
  )
}
