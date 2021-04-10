import React from "react"
import { View, ViewStyle, TextStyle, Dimensions } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"

const { width: deviceWidth } = Dimensions.get("screen")

// #region styles

let ROUTE_STOP_WRAPPER_FLEX_END = 50
let ROUTE_STOP_WRAPPER_MARGIN_BOTTOM = -40
let ROUTE_STOP_CIRCLE_FLEX_END = 18

if (deviceWidth > 400) {
  ROUTE_STOP_WRAPPER_FLEX_END = 71
  ROUTE_STOP_WRAPPER_MARGIN_BOTTOM = -50
  ROUTE_STOP_CIRCLE_FLEX_END = 8
}

const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
  end: ROUTE_STOP_WRAPPER_FLEX_END,
  marginBottom: ROUTE_STOP_WRAPPER_MARGIN_BOTTOM,
}

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 66,
  backgroundColor: color.dim,
}

const ROUTE_STOP_DETAILS: ViewStyle = {
  width: "57%",
  flexDirection: "row",
  alignItems: "center",
  bottom: 55,
  left: 50.5,
}

const ROUTE_STOP_TIME: TextStyle = {
  marginEnd: spacing[4],
  fontSize: 16,
  fontFamily: "System",
  fontWeight: "600",
  end: spacing[4],
  top: 3,
}

const ROUTE_STOP_CIRCLE: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 25,
  borderWidth: 3,
  borderColor: color.dim,
  backgroundColor: color.secondaryBackground,
  end: ROUTE_STOP_CIRCLE_FLEX_END,
}

type RouteStopCardProps = {
  stationName: string
  stopTime: string
  platform?: string
  style?: ViewStyle
}

// #endregion

//  Calculate the dashed line X position
let lineX = deviceWidth / 6.6
if (deviceWidth > 400) lineX = lineX - 2
const lineXPercent = `${lineX}%`

export const RouteStopCard = ({ stationName, stopTime }: RouteStopCardProps) => (
  <View style={ROUTE_STOP_WRAPPER}>
    {/* <Svg height={68} width={"100%"}> */}
    {/* <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1={lineXPercent} y1="0" x2={lineXPercent} y2="80" /> */}
    {/* <Circle cx={lineXPercent} cy="50" r="13" fill={color.background} stroke={color.dim} strokeWidth={3.5} /> */}
    {/* </Svg> */}
    <View style={ROUTE_STOP_LINE}></View>
    <View style={ROUTE_STOP_DETAILS}>
      <Text style={ROUTE_STOP_TIME}>{stopTime}</Text>
      <View style={ROUTE_STOP_CIRCLE} />
      <Text style={{ fontWeight: "600", fontSize: 15, start: spacing[3] }}>{stationName}</Text>
    </View>
  </View>
)
