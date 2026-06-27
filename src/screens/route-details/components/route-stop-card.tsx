import React from "react"
import { View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { RouteLine } from "./route-line"
import { RouteStationCircle } from "./route-station-circle"
import { RouteElementStateType } from "./use-route-colors"

type RouteStopCardProps = {
  stationName: string
  stopTime: string
  /**
   * The stop time, updated with the delay minutes
   */
  delayedTime?: string

  style?: ViewStyle
  topLineState: RouteElementStateType
  bottomLineState: RouteElementStateType
  /**
   * Indicates if this station is outside the user's selected journey
   * (before origin or after destination)
   */
  isOutsideUserJourney?: boolean
}

export const RouteStopCard = (props: RouteStopCardProps) => {
  const { stationName, stopTime, delayedTime, topLineState, bottomLineState, style, isOutsideUserJourney } = props

  return (
    <View style={[styles.routeStopWrapper, style]}>
      <View style={styles.routeStopDetails}>
        <View style={{ flex: 0.265, alignItems: "flex-end" }}>
          <Text
            style={[styles.routeStopTime, delayedTime && styles.routeStopTimeDelayed, isOutsideUserJourney && styles.outsideJourneyText]}
            maxFontSizeMultiplier={1.2}
          >
            {stopTime}
          </Text>
          {delayedTime && (
            <Text style={[styles.routeStopTime, isOutsideUserJourney && styles.outsideJourneyText]} maxFontSizeMultiplier={1.2}>
              {delayedTime}
            </Text>
          )}
        </View>

        <View style={{ flex: 0.2, alignItems: "center" }}>
          <RouteLine state={topLineState} />
          <RouteStationCircle state={topLineState === "hidden" ? "idle" : topLineState} />
          <RouteLine state={bottomLineState} />
        </View>

        <View style={{ flex: 0.55, right: 15 }}>
          <Text style={[styles.stationName, isOutsideUserJourney && styles.outsideJourneyText]} maxFontSizeMultiplier={1.2}>
            {stationName}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  routeStopWrapper: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  routeStopDetails: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  routeStopTime: {
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "600",
  },
  routeStopTimeDelayed: {
    textDecorationLine: "line-through",
    fontSize: 12,
    marginTop: -18,
    marginBottom: theme.spacing[0],
    opacity: 0.5,
  },
  outsideJourneyText: {
    color: theme.colors.dim,
  },
  stationName: {
    fontWeight: "600",
    fontSize: 15,
    marginStart: theme.spacing[3],
  },
}))
