import React from "react"
import { View, ViewStyle, Image, ImageStyle, TextStyle } from "react-native"
import { Text } from "../../../components"
import { translate } from "../../../i18n"
import { color, fontScale, primaryFontIOS, spacing } from "../../../theme"

const railwayStationIcon = require("../../../../assets/railway-station.png")

// #region styles
const ROUTE_STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[6] + 8,
  paddingEnd: spacing[2],
  backgroundColor: color.secondaryBackground,
  zIndex: 100,
}

const ROUTE_STATION_TIME_WRAPPER: ViewStyle = {
  flex: 0.4,
  alignItems: "flex-end",
}

const ROUTE_STATION_DETAILS: ViewStyle = {
  flex: 1,
  marginStart: spacing[4],
}

const ROUTE_STATION_TIME: TextStyle = {
  minWidth: 52 * fontScale,
  marginEnd: spacing[4],
  fontSize: 18,
  fontWeight: "700",
  fontFamily: "System",
}

const ROUTE_DELAY_TIME: TextStyle = {
  marginEnd: 20,
  color: color.destroy,
  fontWeight: "bold",
}

const ROUTE_STATION_NAME: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 2 : -2,
  marginEnd: spacing[3],
  fontSize: 17,
  fontWeight: "700",
}

const ROUTE_STATION_DETAILS_TEXT: TextStyle = {
  fontWeight: "300",
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
  trainNumber?: string

  /**
   * The delay time in full minutes, e.g. 5, 8, 10
   */
  delay: number
  style?: ViewStyle
}

export const RouteStationCard = ({ stationName, stopTime, platform, trainNumber, delay, style }: RouteStopCardProps) => (
  <View style={[ROUTE_STATION_WRAPPER, style]}>
    <View style={ROUTE_STATION_TIME_WRAPPER}>
      <Text style={ROUTE_STATION_TIME}>{stopTime}</Text>
      {delay > 0 && (
        <Text style={ROUTE_DELAY_TIME}>
          + {delay} {translate("routeDetails.minutes")}
        </Text>
      )}
    </View>

    <Image style={RAILWAY_ICON} source={railwayStationIcon} />

    <View style={ROUTE_STATION_DETAILS}>
      <Text style={ROUTE_STATION_NAME}>{stationName}</Text>
      <Text style={ROUTE_STATION_DETAILS_TEXT}>
        {translate("routeDetails.platform")} {platform} {trainNumber && `· ${translate("routeDetails.trainNo")} ${trainNumber}`}
      </Text>
    </View>
  </View>
)
