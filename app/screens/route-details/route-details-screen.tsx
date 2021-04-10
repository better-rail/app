import React from "react"
import { observer } from "mobx-react-lite"
import { View, Image, ViewStyle, ImageStyle, TextStyle } from "react-native"
import { RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { Svg, Line, Circle } from "react-native-svg"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { routeItem, originId, destinationId } = route.params

  const departureTime = routeItem.trains[0].departureTime
  let arrivalTime = routeItem.trains[0].arrivalTime
  let stops = 0

  // If the train contains an exchange, change to arrival time to the last stop from the last train
  if (routeItem.isExchange) {
    stops = routeItem.trains.length
    arrivalTime = routeItem.trains[stops - 1].arrivalTime
  }

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
        <RouteStationCard />
      </ScrollView>
    </Screen>
  )
})

const railwayStationIcon = require("../../../assets/railway-station.png")

// #region styles
const ROUTE_STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing[3],
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

const RouteStationCard = () => (
  <View>
    <View style={ROUTE_STATION_WRAPPER}>
      <Text style={ROUTE_STATION_TIME}>15:03</Text>
      <Image style={RAILWAY_ICON} source={railwayStationIcon} />
      <View style={ROUTE_STATION_DETAILS}>
        <Text style={ROUTE_STATION_NAME}>בית יהושוע</Text>
        <Text>רציף 3</Text>
      </View>
    </View>

    <RouteStopCard />
  </View>
)

const ROUTE_STOP_WRAPPER: ViewStyle = {
  alignItems: "center",
  right: 24,
}

const RouteStopCard = () => (
  <View style={ROUTE_STOP_WRAPPER}>
    <Svg height={700} width={"100%"}>
      <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1="50%" y1="0" x2="50%" y2="700" />
      <Circle cx="50%" cy="60" r="15" fill={color.background} stroke={color.dim} strokeWidth={3.5} />
      <Circle cx="50%" cy="180" r="15" fill={color.background} stroke={color.dim} strokeWidth={3.5} />
    </Svg>
  </View>
)
