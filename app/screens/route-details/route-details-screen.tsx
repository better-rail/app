/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Platform, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScrollView } from "react-native-gesture-handler"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"
import { format } from "date-fns"

import { useStores } from "../../models"
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
import { LivePermissionsSheet } from "./components/live-permissions-sheet"

import type { RouteItem } from "../../services/api"
import type { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import type BottomSheet from "@gorhom/bottom-sheet"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}
export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { ride } = useStores()

  const permissionSheetRef = useRef<BottomSheet>(null)

  // When we present the Live Permissions Sheet we initiate a promise that
  // resolves when all the permissions are given and the user starts a ride
  const permissionsPromise = useRef<() => void>(null)

  // we re-run this check every time the ride changes
  const isRideOnThisRoute = useMemo(() => ride.isRouteActive(route.params.routeItem), [ride.route])

  // if the ride is on this route, we use the ride's route, since it has the latest data
  // otherwise we use the route from the route params
  const routeItem = useMemo(() => {
    if (isRideOnThisRoute) return ride.route as unknown as RouteItem
    return route.params.routeItem
  }, [isRideOnThisRoute, ride.route, route.params.routeItem])

  const progress = useRideProgress({ route: routeItem, enabled: isRideOnThisRoute })
  const { stations } = progress

  const insets = useSafeAreaInsets()

  const [shouldFadeRideButton, setShouldFadeRideButton] = useState(false)

  const openLivePermissionsSheet = () => {
    return new Promise((resolve) => {
      permissionSheetRef.current?.expand()
      permissionsPromise.current = resolve
    })
  }

  const onDoneLivePermissionsSheet = () => {
    permissionSheetRef.current?.close()
    permissionsPromise.current?.()
  }

  useEffect(() => {
    // allow button fade only after the view mounts; disable the animation when the view appears initally.
    setShouldFadeRideButton(true)
  }, [])

  useEffect(() => {
    if (ride.id && progress.status === "arrived") {
      ride.stopRide(ride.id)
    }
  }, [progress.status, ride.id])

  return (
    <>
      <Screen
        style={ROOT}
        preset="fixed"
        unsafe={true}
        statusBar="light-content"
        statusBarBackgroundColor="transparent"
        translucent
      >
        <RouteDetailsHeader
          routeItem={routeItem}
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          screenName={route.name}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />

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
                        <RouteStopCard
                          stationName={stop.stationName}
                          stopTime={format(stop.departureTime, "HH:mm")}
                          delayedTime={train.delay ? format(stop.departureTime + train.delay * 60000, "HH:mm") : undefined}
                          style={{ zIndex: 20 - index }}
                          topLineState={isRideOnThisRoute ? stations[stop.stationId].top : "idle"}
                          bottomLineState={isRideOnThisRoute ? stations[stop.stationId].bottom : "idle"}
                        />
                      </View>
                    ))
                  : // if there are no stops, display a separating line between the route station cards
                    train.stopStations.length === 0 && (
                      <RouteLine
                        style={{ start: "35.44%", height: 30 }}
                        // TODO: The line state doesn't work properly
                        state={isRideOnThisRoute ? stations[train.destinationStationId]?.bottom : "idle"}
                      />
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
                    firstTrain={train}
                    secondTrain={routeItem.trains[index + 1]}
                  />
                )}
              </View>
            )
          })}
        </ScrollView>

        {isRideOnThisRoute && (
          <Animated.View
            entering={shouldFadeRideButton && FadeInDown}
            exiting={FadeOutDown}
            // zIndex is needed for Android in order to make the button pressable
            style={{ flex: 1, zIndex: Platform.select({ ios: 0, android: 1 }) }}
          >
            <LiveRideSheet progress={progress} screenName={route.name} />
          </Animated.View>
        )}

        {(Platform.OS === "android" || ride.canRunLiveActivities) && !isRideOnThisRoute && (
          <Animated.View
            entering={shouldFadeRideButton && FadeInDown.delay(100)}
            exiting={FadeOutDown}
            style={{ flex: 1, zIndex: 1 }}
          >
            <StartRideButton route={routeItem} screenName={route.name} openPermissionsSheet={openLivePermissionsSheet} />
          </Animated.View>
        )}
      </Screen>

      {Platform.OS === "android" && <LivePermissionsSheet onDone={onDoneLivePermissionsSheet} ref={permissionSheetRef} />}
    </>
  )
})
