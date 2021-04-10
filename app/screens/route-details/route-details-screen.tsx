import React from "react"
import { observer } from "mobx-react-lite"
import { View, Image, ViewStyle, ImageStyle, TextStyle, Dimensions } from "react-native"
import { RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { Svg, Line, Circle, G } from "react-native-svg"

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
              {train.stopStations.length > 0 && <RouteLine />}
              <RouteStationCard
                stationName={train.destinationStationName}
                stopTime={format(train.arrivalTime, "HH:mm")}
                platform={train.originPlatform}
                style={{ marginTop: 4 }}
              />
            </>
          )
        })}
      </ScrollView>
    </Screen>
  )
})

const railwayStationIcon = require("../../../assets/railway-station.png")

const { width: deviceWidth } = Dimensions.get("screen")

// #region styles
const ROUTE_STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[7],
  backgroundColor: color.secondaryBackground,
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

const RouteStationCard = ({ stationName, stopTime, platform, style }: RouteStopCardProps) => (
  <View style={[ROUTE_STATION_WRAPPER, style]}>
    <Text style={ROUTE_STATION_TIME}>{stopTime}</Text>
    <Image style={RAILWAY_ICON} source={railwayStationIcon} />
    <View style={ROUTE_STATION_DETAILS}>
      <Text style={ROUTE_STATION_NAME}>{stationName}</Text>
      <Text>רציף {platform}</Text>
    </View>
  </View>
)

const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
  right: 24,
  marginBottom: deviceWidth > 400 ? -30 : -35,
}

const ROUTE_STOP_DETAILS: ViewStyle = {
  width: "57%%",
  flexDirection: "row",

  bottom: 30,
  left: 15.5,
}

const ROUTE_STOP_TIME: TextStyle = {
  ...ROUTE_STATION_TIME,
  fontSize: 16,
  fontWeight: "600",
  end: spacing[4],
  top: 3,
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
    <Svg height={68} width={"100%"}>
      <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1={lineXPercent} y1="0" x2={lineXPercent} y2="80" />
      <Circle cx={lineXPercent} cy="50" r="13" fill={color.background} stroke={color.dim} strokeWidth={3.5} />
    </Svg>
    <View style={ROUTE_STOP_DETAILS}>
      <Text style={ROUTE_STOP_TIME}>{stopTime}</Text>
      <View style={{ width: 30, height: 30, borderRadius: 25 }}></View>
      <Text style={{ fontWeight: "600", maxWidth: 120, flexWrap: "wrap", fontSize: 15, start: spacing[3] }}>{stationName}</Text>
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
