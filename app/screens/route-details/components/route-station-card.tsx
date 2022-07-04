import React from "react"
import { View, ViewStyle, Image, ImageStyle, TextStyle } from "react-native"
import { Text } from "../../../components"
import { isRTL, translate } from "../../../i18n"
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

const ROUTE_STATION_TIME_DELAYED: TextStyle = {
  textDecorationLine: "line-through",
  fontSize: 12,
  textAlign: "right",
  opacity: 0.6,
}

const ROUTE_DELAY_TIME: TextStyle = {
  width: 70 * fontScale,
  marginEnd: isRTL ? 0 : spacing[3] * fontScale,
  color: color.destroy,
  fontWeight: "bold",
}

const ROUTE_STATION_NAME: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 2 : -1,
  marginEnd: spacing[3],
  fontSize: 17,
  fontWeight: "700",
}

const ROUTE_STATION_DETAILS_TEXT: TextStyle = {
  fontSize: 14,
  fontWeight: "300",
}

const LAST_DESTINATION_TEXT: TextStyle = {
  fontSize: 13,
  fontWeight: "300",
  opacity: 0.8,
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
  lastStop?: string

  /**
   * The delay time in full minutes, e.g. 5, 8, 10
   */
  delay?: number

  /**
   * The stop time, updated with the delay minutes
   */
  delayedTime?: string

  style?: ViewStyle
}

export const RouteStationCard = (props: RouteStopCardProps) => {
  const { stationName, stopTime, platform, trainNumber, delay, delayedTime, lastStop, style } = props

  return (
    <View style={[ROUTE_STATION_WRAPPER, style]}>
      <View style={ROUTE_STATION_TIME_WRAPPER}>
        {delayedTime ? (
          <>
            <Text style={[ROUTE_STATION_TIME, ROUTE_STATION_TIME_DELAYED]} maxFontSizeMultiplier={1.1}>
              {stopTime}
            </Text>
            <Text style={[ROUTE_STATION_TIME, { minWidth: undefined }]} maxFontSizeMultiplier={1.1}>
              {delayedTime}
            </Text>
          </>
        ) : (
          <>
            <Text style={ROUTE_STATION_TIME} maxFontSizeMultiplier={1.1}>
              {stopTime}
            </Text>
            {delay > 0 && (
              <Text style={ROUTE_DELAY_TIME} maxFontSizeMultiplier={1.1}>
                + {delay} {translate("routeDetails.minutes")}
              </Text>
            )}
          </>
        )}
      </View>

      <Image style={RAILWAY_ICON} source={railwayStationIcon} />

      <View style={ROUTE_STATION_DETAILS}>
        <Text style={ROUTE_STATION_NAME} maxFontSizeMultiplier={1.25}>
          {stationName}
        </Text>
        <Text style={ROUTE_STATION_DETAILS_TEXT} maxFontSizeMultiplier={1.2}>
          {translate("routeDetails.platform")} {platform} {trainNumber && `· ${translate("routeDetails.trainNo")} ${trainNumber}`}
        </Text>
        {trainNumber && (
          <Text style={LAST_DESTINATION_TEXT} maxFontSizeMultiplier={1.2}>
            {translate("routeDetails.lastStop")}: {lastStop}
          </Text>
        )}
      </View>
    </View>
  )
}
