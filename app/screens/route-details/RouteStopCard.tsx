import React from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"

// #region styles
const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
}

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 10,
  backgroundColor: color.dim,
  zIndex: 0,
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

const ROUTE_STOP_CIRCLE: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 25,
  borderWidth: 3,
  borderColor: color.dim,
  backgroundColor: color.secondaryBackground,
  zIndex: 10,
}

// #endregion

type RouteStopCardProps = {
  stationName: string
  stopTime: string
  style?: ViewStyle
}

export const RouteStopCard = ({ stationName, stopTime, style }: RouteStopCardProps) => (
  <View style={[ROUTE_STOP_WRAPPER, style]}>
    <View style={ROUTE_STOP_DETAILS}>
      <View style={{ flex: 0.265, alignItems: "flex-end" }}>
        <Text style={ROUTE_STOP_TIME}>{stopTime}</Text>
      </View>

      <View style={{ flex: 0.2, alignItems: "center" }}>
        <View style={ROUTE_STOP_LINE} />
        <View style={ROUTE_STOP_CIRCLE} />
        <View style={ROUTE_STOP_LINE} />
      </View>

      <View style={{ flex: 0.55, right: 15 }}>
        <Text style={{ fontWeight: "600", fontSize: 15, marginStart: spacing[3] }}>{stationName}</Text>
      </View>
    </View>
  </View>
)
