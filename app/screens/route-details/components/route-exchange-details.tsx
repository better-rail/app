import React, { useMemo } from "react"
import { View, Image, ViewStyle, ImageStyle, TextStyle, Dimensions } from "react-native"
import { Text, ChangeDirectionButton } from "../../../components"
import { color, spacing, fontScale } from "../../../theme"
import { intervalToDuration, formatDuration } from "date-fns"
import { dateFnsLocalization, translate } from "../../../i18n"

const importantIcon = require("../../../../assets/important.png")
const clockIcon = require("../../../../assets/clock.png")

const { width: deviceWidth } = Dimensions.get("screen")

// Hide the exchange icon when font scaling is on or if the viewport is too narrow,
// since it might make the station name overflow
const DISPLAY_EXCHANGE_ICON = fontScale < 1.1 && deviceWidth >= 360

const ROUTE_EXCHANGE_WRAPPER: ViewStyle = {
  width: "100%",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing[4],
  backgroundColor: color.secondaryLighter,
}

const ROUTE_EXCHANGE_ICON: ViewStyle = {
  marginHorizontal: spacing[4],
  transform: [{ rotate: "90deg" }, { scale: 0.95 }],
  shadowOpacity: 0,
  elevation: 0,
}

const ROUTE_EXCHANGE_INFO_WRAPPER: ViewStyle = {
  alignItems: DISPLAY_EXCHANGE_ICON ? "flex-start" : "center",
}

const ROUTE_EXCHANGE_STATION_NAME: TextStyle = {
  maxWidth: DISPLAY_EXCHANGE_ICON ? "85%" : "100%",
  marginBottom: spacing[1],
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
  opacity: 1,
}

type RouteExchangeProps = {
  stationName: string
  arrivalPlatform: number
  departurePlatform: number
  arrivalTime: number
  depatureTime: number
  style?: ViewStyle
}

export const RouteExchangeDetails = (props: RouteExchangeProps) => {
  const { stationName, arrivalPlatform, departurePlatform, arrivalTime, depatureTime, style } = props

  const platformDetailText = useMemo(() => {
    if (arrivalPlatform === departurePlatform) {
      return `${translate("routeDetails.platformStay")} ${arrivalPlatform}`
    } else {
      return `${translate("routeDetails.platformExchange")} ${departurePlatform}`
    }
  }, [])

  const exchangeDuration = useMemo(() => {
    const durationObject = intervalToDuration({ start: arrivalTime, end: depatureTime })
    const formattedDuration = formatDuration(durationObject, { locale: dateFnsLocalization })

    return formattedDuration
  }, [])

  return (
    <View style={[ROUTE_EXCHANGE_WRAPPER, style]}>
      {DISPLAY_EXCHANGE_ICON && <ChangeDirectionButton buttonStyle={ROUTE_EXCHANGE_ICON} />}
      <View>
        <Text style={ROUTE_EXCHANGE_STATION_NAME}>
          {translate("routeDetails.exchangeAt")}
          {stationName}
        </Text>
        <View style={ROUTE_EXCHANGE_INFO_WRAPPER}>
          <View style={[ROUTE_EXCHANGE_INFO_DETAIL_WRAPPER, { marginBottom: spacing[1] }]}>
            <Image style={ROUTE_EXCHANGE_INFO_ICON} source={importantIcon} />
            <Text style={ROUTE_EXCHANGE_INFO_TEXT}>{platformDetailText}</Text>
          </View>
          <View style={[ROUTE_EXCHANGE_INFO_DETAIL_WRAPPER, { marginBottom: fontScale > 1 ? spacing[3] : 0 }]}>
            <Image style={ROUTE_EXCHANGE_INFO_ICON} source={clockIcon} />
            <Text style={ROUTE_EXCHANGE_INFO_TEXT}>
              {translate("routeDetails.waitingTime")} {exchangeDuration}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
