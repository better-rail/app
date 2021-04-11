import React from "react"
import { View, Image, ViewStyle, ImageStyle, TextStyle, PixelRatio } from "react-native"
import { Text, ChangeDirectionButton } from "../../../components"
import { color, spacing } from "../../../theme"

const importantIcon = require("../../../../assets/important.png")
const clockIcon = require("../../../../assets/clock.png")

const fontScale = PixelRatio.getFontScale()

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

const ROUTE_EXCHANGE_STATION_NAME: TextStyle = {
  marginBottom: spacing[0],
  fontSize: 18,
  fontWeight: "700",
}

const ROUTE_EXCHANGE_INFO_WRAPPER: ViewStyle = {
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
  style?: ViewStyle
}

// Hide the exchange icon when font scaling is on, since it might make the station name overflow
const DISPLAY_EXCHANGE_ICON = fontScale < 1.1

export const RouteExchangeDetails = ({ style }: RouteExchangeProps) => (
  <View style={[ROUTE_EXCHANGE_WRAPPER, style]}>
    {DISPLAY_EXCHANGE_ICON && <ChangeDirectionButton style={ROUTE_EXCHANGE_ICON} />}
    <View>
      <Text style={[ROUTE_EXCHANGE_STATION_NAME, { textAlign: DISPLAY_EXCHANGE_ICON ? "left" : "center" }]}>
        החלפה בתל אביב - סבידור מרכז
      </Text>
      <View style={{ alignItems: DISPLAY_EXCHANGE_ICON ? "flex-start" : "center" }}>
        <View style={[ROUTE_EXCHANGE_INFO_WRAPPER, { marginBottom: spacing[1] }]}>
          <Image style={ROUTE_EXCHANGE_INFO_ICON} source={importantIcon} />
          <Text style={ROUTE_EXCHANGE_INFO_TEXT}>יש לעבור לרציף 4</Text>
        </View>
        <View style={[ROUTE_EXCHANGE_INFO_WRAPPER, { marginBottom: fontScale > 1 && spacing[3] }]}>
          <Image style={ROUTE_EXCHANGE_INFO_ICON} source={clockIcon} />
          <Text style={ROUTE_EXCHANGE_INFO_TEXT}>זמן המתנה כ-7 דק׳</Text>
        </View>
      </View>
    </View>
  </View>
)
