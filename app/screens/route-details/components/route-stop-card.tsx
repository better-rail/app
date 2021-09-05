import React from "react"
import { View, ViewStyle, TextStyle, Platform } from "react-native"
import { Text } from "../../../components"
import { color, fontScale, spacing } from "../../../theme"

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

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 10 * fontScale,
  backgroundColor: color.separator,
  zIndex: 0,
}

const ROUTE_STOP_CIRCLE: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 25,
  borderWidth: 3.5,
  borderColor: Platform.select({ ios: color.separator, android: "#bdbdc2" }),
  backgroundColor: color.background,
  zIndex: 10,
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
}

export const RouteStopCard = ({ stationName, stopTime, delayedTime, style }: RouteStopCardProps) => (
  <View style={[ROUTE_STOP_WRAPPER, style]}>
    <View style={ROUTE_STOP_DETAILS}>
      <View style={{ flex: 0.265, alignItems: "flex-end" }}>
        <Text style={[ROUTE_STOP_TIME, delayedTime && ROUTE_STOP_TIME_DELAYED]} maxFontSizeMultiplier={1.2}>
          {stopTime}
        </Text>
        {delayedTime && (
          <Text style={ROUTE_STOP_TIME} maxFontSizeMultiplier={1.2}>
            {delayedTime}
          </Text>
        )}
      </View>

      <View style={{ flex: 0.2, alignItems: "center" }}>
        <View style={ROUTE_STOP_LINE} />
        <View style={ROUTE_STOP_CIRCLE} />
        <View style={ROUTE_STOP_LINE} />
      </View>

      <View style={{ flex: 0.55, right: 15 }}>
        <Text style={{ fontWeight: "600", fontSize: 15, marginStart: spacing[3] }} maxFontSizeMultiplier={1.2}>
          {stationName}
        </Text>
      </View>
    </View>
  </View>
)
