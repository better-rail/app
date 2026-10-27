/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import { Platform, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { ScrollView } from "react-native-gesture-handler"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"
import { useShallow } from "zustand/react/shallow"
import { useQuery } from "react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRideStore } from "@/models"
import { useRideProgress } from "@/hooks/use-ride-progress"
import { spacing } from "@/theme"
import type { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { useStations } from "@/data/stations"
import { calculateDelayedTime, formatClockTime, formatDateForAPI, formatTime } from "@/utils/helpers/date-helpers"
import { getSelectedRide, isSameRoute } from "@/utils/helpers/ride-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { getVoucherTrain } from "@/utils/helpers/voucher-helpers"
import { publishFreshRoutes } from "@/screens/route-list/route-list-query"
import {
  LiveRideSheet,
  LongRouteWarning,
  RouteChangeWarnings,
  RouteExchangeDetails,
  RouteLine,
  RouteStationCard,
  RouteStopCard,
  StartRideButton,
  TrainInfoButton,
  VoucherButton,
} from "./components"
import { SideInsetBleedProvider } from "./components/side-inset-bleed"

const routeApi = new RouteApi()
const NO_BLEED = { start: 0, end: 0 }

// The text button renders 4pt taller than its minimum at the default font
// scale because of its line box and padding. Match that visible surface.
const floatingButtonSize = (fontScale: number) => Math.max(59, 55 * Math.min(fontScale, 1.2))

/**
 * Keeps a route fresh while it's on screen: refetched every minute for platform changes and delays, or taken
 * from the active ride when it's the one being ridden. Shared by the route details screen and the route list's
 * details pane.
 */
export function useRouteDetailsData(paramsRouteItem: RouteItem, originId: string, destinationId: string) {
  const viaStationId = paramsRouteItem.viaStationId
  const {
    rideRoute,
    id: rideId,
    stopRide,
  } = useRideStore(useShallow((s) => ({ rideRoute: s.route, id: s.id, stopRide: s.stopRide })))

  // Derived from both inputs: openActiveRide can swap the params under a mounted screen
  const isRideOnThisRoute = isSameRoute(rideRoute, paramsRouteItem)

  const trainNumbers = paramsRouteItem.trains.map((t) => t.trainNumber)

  // Periodically refetch route data to catch platform changes and delays.
  // Skip when ride is active — the ride polling already handles updates.
  const { data: freshRouteItem } = useQuery(
    ["routeDetails", originId, destinationId, viaStationId, paramsRouteItem.departureTime, ...trainNumbers],
    async () => {
      const [date, time] = formatDateForAPI(paramsRouteItem.departureTime)
      const fromId = paramsRouteItem.trains[0].originStationId.toString()
      const toId = paramsRouteItem.trains[paramsRouteItem.trains.length - 1].destinationStationId.toString()
      const routes = await routeApi.getRoutes(fromId, toId, date, time, { viaStation: viaStationId })
      // A change-station search isn't what the list shows
      if (!viaStationId && originId && destinationId) publishFreshRoutes(originId, destinationId, routes)
      const fresh = getSelectedRide(routes, trainNumbers)
      return fresh ? { ...fresh, viaStationId } : paramsRouteItem
    },
    {
      initialData: paramsRouteItem,
      refetchInterval: 60_000,
      enabled: !isRideOnThisRoute,
    },
  )

  // if the ride is on this route, we use the ride's route, since it has the latest data
  // otherwise we use the freshly fetched route data
  const routeItem = (() => {
    if (isRideOnThisRoute) return rideRoute as unknown as RouteItem
    return freshRouteItem ?? paramsRouteItem
  })()

  const progress = useRideProgress({ route: routeItem, enabled: isRideOnThisRoute })

  useEffect(() => {
    if (rideId && progress.status === "arrived") {
      stopRide(rideId)
    }
  }, [progress.status, rideId])

  return { routeItem, isRideOnThisRoute, progress }
}

export type RouteDetailsData = ReturnType<typeof useRouteDetailsData>

interface RouteDetailsBodyProps {
  data: RouteDetailsData
  screenName: "routeDetails" | "activeRide"
  showEntireRoute: boolean
  /** Logical side insets the content keeps clear of. */
  sideInsets: { start: number; end: number }
  /**
   * Whether banner backgrounds reach under the side insets. Off by default: they stop at the insets, as wide as the
   * station cards, rather than run under iPhone Duo's vertical bar.
   */
  bleedUnderInsets?: boolean
}

/** The route's stations, change banners and ride controls, below the route header. */
export function RouteDetailsBody({
  data,
  screenName,
  showEntireRoute,
  sideInsets,
  bleedUnderInsets = false,
}: RouteDetailsBodyProps) {
  const { routeItem, isRideOnThisRoute, progress } = data
  const { stations } = progress
  const { rt } = useUnistyles()
  const insets = useSafeAreaInsets()
  const canRunLiveActivities = useRideStore((s) => s.canRunLiveActivities)
  const allStations = useStations()

  const voucherTrain = getVoucherTrain(routeItem)
  // During a ride the action buttons stack above the sheet, so the route needs room to scroll past them
  const liveActionsRowHeight = isRideOnThisRoute ? floatingButtonSize(rt.fontScale) + spacing[3] : 0
  const [shouldFadeRideButton, setShouldFadeRideButton] = useState(false)

  useEffect(() => {
    // allow button fade only after the view mounts; disable the animation when the view appears initally.
    setShouldFadeRideButton(true)
  }, [])

  return (
    // Positioned so the ride controls anchor to the bottom of the body, whether it fills a screen or a pane.
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
        {/* The scroll view spans the full width so banner backgrounds can bleed under the side
          insets; its content stays clear of them. */}
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing[4],
            paddingBottom: 80 + insets.bottom + liveActionsRowHeight,
            paddingStart: sideInsets.start,
            paddingEnd: sideInsets.end,
          }}
          showsVerticalScrollIndicator={false}
        >
          <SideInsetBleedProvider value={bleedUnderInsets ? sideInsets : NO_BLEED}>
            {routeItem.isMuchLonger && screenName === "routeDetails" && <LongRouteWarning />}
            {routeItem.trains.map((train, index) => {
              // When showing the entire route, we need to organize all stations in order
              if (showEntireRoute && train.routeStations && train.routeStations.length > 0) {
                // Get all route stations
                const allRouteStations = train.routeStations
                // Find indices of origin and destination stations
                const originIndex = allRouteStations.findIndex((s) => s.stationId === train.originStationId)
                const destinationIndex = allRouteStations.findIndex((s) => s.stationId === train.destinationStationId)
                // Stations the user actually rides through, between origin and destination
                const betweenStations = allRouteStations.slice(originIndex + 1, destinationIndex)

                return (
                  <View key={train.trainNumber} style={styles.stationContainer}>
                    <RouteChangeWarnings train={train} />

                    {/* Stations before origin */}
                    {allRouteStations.slice(0, originIndex).map((station, idx) => {
                      const isFirstStation = idx === 0
                      return (
                        <View key={`before-${station.stationId}`}>
                          <RouteStopCard
                            stationName={allStations.find((c) => c.id === station.stationId.toString())?.name ?? ""}
                            stopTime={formatClockTime(station.arrivalTime)}
                            delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                            style={{ zIndex: 20 - idx, opacity: 0.7 }}
                            topLineState={isFirstStation ? "hidden" : "idle"}
                            bottomLineState="idle"
                            isOutsideUserJourney={true}
                            isCancelled={station.cancelled}
                          />
                        </View>
                      )
                    })}

                    {/* Origin station */}
                    <RouteStationCard
                      stationName={train.originStationName}
                      stopTime={formatTime(train.departureTime)}
                      platform={train.originPlatform}
                      platformChanged={train.originPlatformChanged}
                      trainNumber={train.trainNumber}
                      lastStop={train.lastStop}
                      lastStopChanged={train.isLastStopChanged}
                      delay={train.delay}
                    />

                    {/* Stations between origin and destination */}
                    {betweenStations.length > 0 ? (
                      betweenStations.map((station, idx) => (
                        <View key={`between-${station.stationId}`}>
                          <RouteStopCard
                            stationName={allStations.find((c) => c.id === station.stationId.toString())?.name ?? ""}
                            stopTime={formatClockTime(station.arrivalTime)}
                            delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                            style={{ zIndex: 20 - idx }}
                            topLineState={isRideOnThisRoute ? stations[station.stationId]?.top || "idle" : "idle"}
                            bottomLineState={isRideOnThisRoute ? stations[station.stationId]?.bottom || "idle" : "idle"}
                            isCancelled={station.cancelled}
                          />
                        </View>
                      )) // if there are no stops, display a separating line between the route station cards
                    ) : (
                      <RouteLine
                        style={{ start: "35.44%", height: 30 }}
                        state={isRideOnThisRoute ? stations[train.destinationStationId]?.bottom || "idle" : "idle"}
                      />
                    )}

                    {/* Destination station */}
                    <RouteStationCard
                      stationName={train.destinationStationName}
                      stopTime={formatTime(train.arrivalTime)}
                      delayedTime={calculateDelayedTime(train.arrivalTime, train.delay)}
                      platform={train.destinationPlatform}
                      platformChanged={train.destinationPlatformChanged}
                    />

                    {/* Stations after destination */}
                    {allRouteStations.slice(destinationIndex + 1).map((station, idx, arr) => {
                      const isLastStation = idx === arr.length - 1
                      return (
                        <View key={`after-${station.stationId}`}>
                          <RouteStopCard
                            stationName={allStations.find((c) => c.id === station.stationId.toString())?.name ?? ""}
                            stopTime={formatClockTime(station.arrivalTime)}
                            delayedTime={calculateDelayedTime(station.arrivalTime, train.delay)}
                            style={{ zIndex: 20 - idx, opacity: 0.7 }}
                            topLineState="idle"
                            bottomLineState={isLastStation ? "hidden" : "idle"}
                            isOutsideUserJourney={true}
                            isCancelled={station.cancelled}
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
                        isRideOnThisRoute={isRideOnThisRoute}
                      />
                    )}
                  </View>
                )
              }

              // Original display logic when not showing entire route
              return (
                <View key={train.trainNumber} style={styles.stationContainer}>
                  <RouteChangeWarnings train={train} />

                  <RouteStationCard
                    stationName={train.originStationName}
                    stopTime={formatTime(train.departureTime)}
                    platform={train.originPlatform}
                    platformChanged={train.originPlatformChanged}
                    trainNumber={train.trainNumber}
                    lastStop={train.lastStop}
                    lastStopChanged={train.isLastStopChanged}
                    delay={train.delay}
                  />

                  {train.stopStations.length > 0
                    ? train.stopStations.map((stop, idx) => (
                        <View key={stop.stationId}>
                          <RouteStopCard
                            stationName={stop.stationName}
                            stopTime={formatTime(stop.departureTime)}
                            delayedTime={calculateDelayedTime(stop.departureTime, train.delay)}
                            style={{ zIndex: 20 - idx }}
                            topLineState={isRideOnThisRoute ? stations[stop.stationId]?.top || "idle" : "idle"}
                            bottomLineState={isRideOnThisRoute ? stations[stop.stationId]?.bottom || "idle" : "idle"}
                            isCancelled={stop.cancelled}
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
                    stopTime={formatTime(train.arrivalTime)}
                    delayedTime={calculateDelayedTime(train.arrivalTime, train.delay)}
                    platform={train.destinationPlatform}
                    platformChanged={train.destinationPlatformChanged}
                  />

                  {routeItem.isExchange && routeItem.trains.length - 1 !== index && (
                    <RouteExchangeDetails
                      stationName={train.destinationStationName}
                      arrivalPlatform={train.destinationPlatform}
                      departurePlatform={routeItem.trains[index + 1].originPlatform}
                      firstTrain={train}
                      secondTrain={routeItem.trains[index + 1]}
                      isRideOnThisRoute={isRideOnThisRoute}
                    />
                  )}
                </View>
              )
            })}
          </SideInsetBleedProvider>
        </ScrollView>
      </View>

      {isRideOnThisRoute && (
        <Animated.View
          entering={shouldFadeRideButton && FadeInDown}
          exiting={FadeOutDown}
          // The whole bottom, the side bar column included: it only holds controls at the top, as for the ride
          // button below. zIndex is needed for Android in order to make the button pressable.
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: Platform.select({ ios: 0, android: 1 }) }}
        >
          {/* Train composition and vouchers matter most while riding, so their actions ride above the sheet */}
          <View style={styles.liveActions}>
            {voucherTrain && <VoucherButton train={voucherTrain} style={styles.infoButton} />}
            <TrainInfoButton route={routeItem} style={styles.infoButton} />
          </View>
          {/* The wrapper is already pinned to the bottom. Keeping the sheet in flow stacks the actions above it, not under it */}
          <LiveRideSheet progress={progress} screenName={screenName} style={styles.liveRideSheet} />
        </Animated.View>
      )}

      {!isRideOnThisRoute && (Platform.OS === "android" || canRunLiveActivities || voucherTrain) && (
        <Animated.View
          entering={shouldFadeRideButton && FadeInDown.delay(100)}
          exiting={FadeOutDown}
          style={{
            position: "absolute",
            start: 0,
            // The side bar column only holds controls at the top, so the ride button can use its bottom.
            end: 18,
            bottom: Math.max(insets.bottom + 12, 32),
            zIndex: 10,
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          {voucherTrain && <VoucherButton train={voucherTrain} style={styles.infoButton} />}

          {(Platform.OS === "android" || canRunLiveActivities) && <TrainInfoButton route={routeItem} style={styles.infoButton} />}

          {(Platform.OS === "android" || canRunLiveActivities) && <StartRideButton route={routeItem} screenName={screenName} />}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
  },
  stationContainer: {
    backgroundColor: theme.colors.background,
  },
  infoButton: {
    width: floatingButtonSize(rt.fontScale),
    height: floatingButtonSize(rt.fontScale),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Platform.select({ ios: 16, android: 6 }),
    borderCurve: "continuous",
    // Android's tertiaryBackground is the screen background — inputBackground is the raised one.
    backgroundColor: isLiquidGlassSupported
      ? undefined
      : Platform.OS === "android"
        ? theme.colors.inputBackground
        : theme.colors.tertiaryBackground,
    elevation: 3,
  },
  liveActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing[3],
    // Like the ride button: the side bar column only holds controls at the top.
    paddingEnd: 18,
    marginBottom: theme.spacing[3],
  },
  liveRideSheet: {
    position: "relative",
  },
}))
