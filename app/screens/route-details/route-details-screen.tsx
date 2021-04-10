import React from "react"
import { observer } from "mobx-react-lite"
import { View, Dimensions, ViewStyle, TextStyle } from "react-native"
import { RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { Svg, Line, Circle, G } from "react-native-svg"
import { RouteStationCard } from "./RouteStationCard"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { routeItem } = route.params

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true}>
      <SharedElement id="route-header">
        <RouteDetailsHeader
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </SharedElement>

      <ScrollView contentContainerStyle={{ paddingTop: spacing[4] }} showsVerticalScrollIndicator={false}>
        {routeItem.trains.map((train) => {
          return (
            <>
              <RouteStationCard
                stationName={train.originStationName}
                stopTime={format(train.departureTime, "HH:mm")}
                platform={train.originPlatform}
              />
              {train.stopStations.map((stop) => (
                <RouteStopCard
                  stationName={stop.stationName}
                  stopTime={format(stop.departureTime, "HH:mm")}
                  key={stop.stationId}
                />
              ))}
              {/* {train.stopStations.length > 0 && <RouteLine />} */}
              <RouteStationCard
                stationName={train.destinationStationName}
                stopTime={format(train.arrivalTime, "HH:mm")}
                platform={train.destinationPlatform}
                style={{ marginTop: spacing[2] }}
              />
            </>
          )
        })}
      </ScrollView>
    </Screen>
  )
})

const { width: deviceWidth } = Dimensions.get("screen")

let ROUTE_STOP_WRAPPER_FLEX_END = 71
let ROUTE_STOP_WRAPPER_MARGIN_BOTTOM = -50
let ROUTE_STOP_CIRCLE_FLEX_END = 11

if (deviceWidth < 400) {
  ROUTE_STOP_WRAPPER_FLEX_END = 50
  ROUTE_STOP_WRAPPER_MARGIN_BOTTOM = -40
  ROUTE_STOP_CIRCLE_FLEX_END = 18
}

const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
  end: ROUTE_STOP_WRAPPER_FLEX_END,
  marginBottom: ROUTE_STOP_WRAPPER_MARGIN_BOTTOM,
}

const ROUTE_STOP_DETAILS: ViewStyle = {
  width: "57%",
  flexDirection: "row",
  alignItems: "center",
  bottom: 55,
  left: 52.5,
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

//  Calculate the dashed line X position
let lineX = deviceWidth / 6.6
if (deviceWidth > 400) lineX = lineX - 2
const lineXPercent = `${lineX}%`

const RouteStopCard = ({ stationName, stopTime }: RouteStopCardProps) => (
  <View style={ROUTE_STOP_WRAPPER}>
    {/* <Svg height={68} width={"100%"}> */}
    {/* <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1={lineXPercent} y1="0" x2={lineXPercent} y2="80" /> */}
    {/* <Circle cx={lineXPercent} cy="50" r="13" fill={color.background} stroke={color.dim} strokeWidth={3.5} /> */}
    {/* </Svg> */}
    <View style={{ width: 4, height: 66, backgroundColor: color.dim }}></View>
    <View style={ROUTE_STOP_DETAILS}>
      <Text style={ROUTE_STOP_TIME}>{stopTime}</Text>
      <View style={ROUTE_STOP_CIRCLE} />
      <Text style={{ fontWeight: "600", fontSize: 15, start: spacing[3] }}>{stationName}</Text>
    </View>
  </View>
)

let ROUTE_LINE_POSITION = { marginBottom: -40, top: -12.5 }
if (deviceWidth > 400) {
  ROUTE_LINE_POSITION = { marginBottom: -45, top: -17 }
}

const RouteLine = () => (
  <View style={[ROUTE_STOP_WRAPPER, ROUTE_LINE_POSITION]}>
    <Svg height={64} width={"100%"}>
      <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1={lineXPercent} y1="0" x2={lineXPercent} y2="80" />
    </Svg>
  </View>
)
