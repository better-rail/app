import React from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"
import { RouteLine } from "./route-line"
import { RouteStationCircle } from "./route-station-circle"
import { RouteElementStateType } from "./use-route-colors"

// #region styles
const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
  backgroundColor: color.background,
}

const ROUTE_STOP_DETAILS: ViewStyle = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
}

const ROUTE_STOP_TIME: TextStyle = {
  fontSize: 16,
  fontFamily: "System",
  fontWeight: "600",
}

const ROUTE_STOP_TIME_DELAYED: TextStyle = {
  textDecorationLine: "line-through",
  fontSize: 12,
  marginTop: -18,
  marginBottom: spacing[0],
  opacity: 0.5,
}

const OUTSIDE_JOURNEY_TEXT: TextStyle = {
  color: color.dim,
}

// #endregion

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
    <View style={[ROUTE_STOP_WRAPPER, style]}>
      <View style={ROUTE_STOP_DETAILS}>
        <View style={{ flex: 0.265, alignItems: "flex-end" }}>
          <Text
            style={[ROUTE_STOP_TIME, delayedTime && ROUTE_STOP_TIME_DELAYED, isOutsideUserJourney && OUTSIDE_JOURNEY_TEXT]}
            maxFontSizeMultiplier={1.2}
          >
            {stopTime}
          </Text>
          {delayedTime && (
            <Text style={[ROUTE_STOP_TIME, isOutsideUserJourney && OUTSIDE_JOURNEY_TEXT]} maxFontSizeMultiplier={1.2}>
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
          <Text
            style={[{ fontWeight: "600", fontSize: 15, marginStart: spacing[3] }, isOutsideUserJourney && OUTSIDE_JOURNEY_TEXT]}
            maxFontSizeMultiplier={1.2}
          >
            {stationName}
          </Text>
        </View>
      </View>
    </View>
  )
}
