import React from "react"
import { View, ViewStyle, Image, ImageStyle, TextStyle } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"

const railwayStationIcon = require("../../../assets/railway-station.png")

// #region styles
const ROUTE_STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[6],
  paddingEnd: spacing[2],
  backgroundColor: color.secondaryBackground,
  zIndex: 100,
}

const ROUTE_STATION_DETAILS: ViewStyle = {
  marginStart: spacing[4],
}

const ROUTE_STATION_TIME: TextStyle = {
  marginEnd: spacing[4],
  fontSize: 18,
  fontWeight: "700",
  fontFamily: "System",
}

const ROUTE_STATION_NAME: TextStyle = {
  marginBottom: -2,
  marginEnd: spacing[3],
  fontSize: 17,
  fontWeight: "700",
}

const RAILWAY_ICON: ImageStyle = {
  width: 42.5,
  height: 42.5,
}

// #endregion

type RouteStopCardProps = {
  stationName: string
  stopTime: string
  platform?: string
  style?: ViewStyle
}

export const RouteStationCard = ({ stationName, stopTime, platform, style }: RouteStopCardProps) => (
  <View style={[ROUTE_STATION_WRAPPER, style]}>
    <View style={{ flex: 0.4, alignItems: "flex-end" }}>
      <Text style={ROUTE_STATION_TIME}>{stopTime}</Text>
    </View>

    <Image style={RAILWAY_ICON} source={railwayStationIcon} />

    <View style={{ flex: 1 }}>
      <View style={ROUTE_STATION_DETAILS}>
        <Text style={ROUTE_STATION_NAME}>{stationName}</Text>
        <Text>רציף {platform}</Text>
      </View>
    </View>
  </View>
)
