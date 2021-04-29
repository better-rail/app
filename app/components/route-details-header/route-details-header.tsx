import * as React from "react"
import { Image, ImageBackground, View, ViewStyle, TextStyle, ImageStyle, Appearance } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { color, spacing } from "../../theme"
import { Text } from "../"
import { stationsObject, STATION_LOCALE } from "../../data/stations"

const arrowIcon = require("../../../assets/arrow-left.png")

const colorScheme = Appearance.getColorScheme()
// #region styles

const ROUTE_DETAILS_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
}

const ROUTE_DETAILS_STATION: ViewStyle = {
  flex: 1,
  padding: spacing[2],
  backgroundColor: color.secondaryLighter,
  borderRadius: 25,

  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: colorScheme === "dark" ? 0 : 0.45,
  elevation: 1,
  zIndex: 0,
}

const ROUTE_DETAILS_STATION_TEXT: TextStyle = {
  color: color.text,
  opacity: 0.8,
  textAlign: "center",
  fontWeight: "600",
  fontSize: 14,
}

const ROUTE_INFO_CIRCLE: ViewStyle = {
  width: 34,
  height: 34,
  position: "absolute",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: color.secondary,
  borderRadius: 25,
  elevation: 1,
  zIndex: 5,
}

const ARROW_ICON: ImageStyle = {
  width: 15,
  height: 15,
  tintColor: color.whiteText,
}

const GARDIENT: ViewStyle = {
  height: "100%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  opacity: 1,
}

// #endregion

export interface RouteDetailsHeaderProps {
  /**
   * The route's origin station Id.
   */
  originId: string
  /**
   * The route's destination station Id.
   */
  destinationId: string
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const RouteDetailsHeader = React.memo(function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { originId, destinationId, style } = props

  const originName = stationsObject[originId][STATION_LOCALE]
  const destinationName = stationsObject[destinationId][STATION_LOCALE]

  return (
    <View>
      <ImageBackground source={stationsObject[originId].image} style={{ width: "100%", height: 200, zIndex: 0 }}>
        <LinearGradient style={GARDIENT} colors={["rgba(0, 0, 0, 0.75)", "rgba(0, 0, 0, 0.05)"]} />
      </ImageBackground>

      <View style={{ top: -20, marginBottom: -30, zIndex: 5 }}>
        <View style={[ROUTE_DETAILS_WRAPPER, style]}>
          <View style={[ROUTE_DETAILS_STATION, { marginRight: spacing[5] }]}>
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {originName}
            </Text>
          </View>
          <View style={ROUTE_INFO_CIRCLE}>
            <Image source={arrowIcon} style={ARROW_ICON} />
          </View>
          <View style={ROUTE_DETAILS_STATION}>
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {destinationName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
})
