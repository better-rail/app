import * as React from "react"
import { Image, View, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { color, spacing } from "../../theme"
import { Text } from "../"
import { stationsObject } from "../../data/stations"

const arrowIcon = require("../../../assets/arrow-left.png")

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
}

const ARROW_ICON: ImageStyle = {
  width: 15,
  height: 15,
  tintColor: color.background,
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

  const originName = stationsObject[originId].hebrew
  const destinationName = stationsObject[destinationId].hebrew

  return (
    <View style={[ROUTE_DETAILS_WRAPPER, style]}>
      <View style={[ROUTE_DETAILS_STATION, { marginRight: spacing[5] }]}>
        <Text style={ROUTE_DETAILS_STATION_TEXT}>{originName}</Text>
      </View>
      <View style={ROUTE_INFO_CIRCLE}>
        <Image source={arrowIcon} style={ARROW_ICON} />
      </View>
      <View style={ROUTE_DETAILS_STATION}>
        <Text style={ROUTE_DETAILS_STATION_TEXT}>{destinationName}</Text>
      </View>
    </View>
  )
})
