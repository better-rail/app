import React, { useMemo } from "react"
import { View, Image, ViewStyle, ImageStyle, TextStyle, PixelRatio, Dimensions } from "react-native"
import { Text, ChangeDirectionButton } from "../../../components"
import { color, spacing } from "../../../theme"
import { intervalToDuration, formatDuration } from "date-fns"
import { he } from "date-fns/locale"

const importantIcon = require("../../../../assets/important.png")
const clockIcon = require("../../../../assets/clock.png")

const fontScale = PixelRatio.getFontScale()
const { width: deviceWidth } = Dimensions.get("screen")

// Hide the exchange icon when font scaling is on or if the viewport is too narrow,
// since it might make the station name overflow
const DISPLAY_EXCHANGE_ICON = fontScale < 1.1 || deviceWidth < 360

const ROUTE_EXCHANGE_WRAPPER: ViewStyle = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.secondaryLighter,
}

const ROUTE_EXCHANGE_ICON: ViewStyle = {
  transform: [{ rotate: "90deg" }, { scale: 0.95 }],
  shadowOpacity: 0,
  marginEnd: spacing[4],
}

const ROUTE_EXCHANGE_INFO_WRAPPER: ViewStyle = {
  alignItems: DISPLAY_EXCHANGE_ICON ? "flex-start" : "center",
}

const ROUTE_EXCHANGE_STATION_NAME: TextStyle = {
  marginBottom: spacing[0],
  fontSize: 18,
  fontWeight: "700",
  textAlign: DISPLAY_EXCHANGE_ICON ? "left" : "center",
}

const ROUTE_EXCHANGE_INFO_DETAIL_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const ROUTE_EXCHANGE_INFO_TEXT: TextStyle = {
  fontSize: 16,
}

const ROUTE_EXCHANGE_INFO_ICON: ImageStyle = {
  width: 25,
  height: 25,
  marginEnd: 5,
}

type RouteExchangeProps = {
  stationName: string
  arrivalPlatform: string
  departurePlatform: string
  arrivalTime: number
  depatureTime: number
  style?: ViewStyle
}

export const RouteExchangeDetails = (props: RouteExchangeProps) => {
  const { stationName, arrivalPlatform, departurePlatform, arrivalTime, depatureTime, style } = props

  const platformDetailText = useMemo(() => {
    if (arrivalPlatform === departurePlatform) {
      return `יש להשאר ברציף ${arrivalPlatform}`
    } else {
      return `יש לעבור לרציף ${departurePlatform}`
    }
  }, [])

  const exchangeDuration = useMemo(() => {
    const durationObject = intervalToDuration({ start: arrivalTime, end: depatureTime })
    const formattedDuration = formatDuration(durationObject, { locale: he })

    return formattedDuration
  }, [])

  return (
    <View style={[ROUTE_EXCHANGE_WRAPPER, style]}>
      {DISPLAY_EXCHANGE_ICON && <ChangeDirectionButton style={ROUTE_EXCHANGE_ICON} />}
      <View>
        <Text style={ROUTE_EXCHANGE_STATION_NAME}>החלפה ב{stationName}</Text>
        <View style={ROUTE_EXCHANGE_INFO_WRAPPER}>
          <View style={[ROUTE_EXCHANGE_INFO_DETAIL_WRAPPER, { marginBottom: spacing[1] }]}>
            <Image style={ROUTE_EXCHANGE_INFO_ICON} source={importantIcon} />
            <Text style={ROUTE_EXCHANGE_INFO_TEXT}>{platformDetailText}</Text>
          </View>
          <View style={[ROUTE_EXCHANGE_INFO_DETAIL_WRAPPER, { marginBottom: fontScale > 1 && spacing[3] }]}>
            <Image style={ROUTE_EXCHANGE_INFO_ICON} source={clockIcon} />
            <Text style={ROUTE_EXCHANGE_INFO_TEXT}>זמן המתנה כ- {exchangeDuration}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
