import React from "react"
import { observer } from "mobx-react-lite"
import { View, Image, ViewStyle, ImageStyle, TextStyle } from "react-native"
import { RouteCard, RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"

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
      <ScrollView>
        <RouteStationCard />
      </ScrollView>
    </Screen>
  )
})

const railwayStationIcon = require("../../../assets/railway-station.png")

const ROUTE_STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[7],
  backgroundColor: color.secondaryBackground,
}

const ROUTE_STATION_DETAILS: ViewStyle = {
  marginStart: spacing[3],
}

const ROUTE_STATION_TIME: TextStyle = {
  marginEnd: spacing[3],
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

const RouteStationCard = () => (
  <View style={ROUTE_STATION_WRAPPER}>
    <Text style={ROUTE_STATION_TIME}>15:03</Text>
    <Image style={RAILWAY_ICON} source={railwayStationIcon} />
    <View style={ROUTE_STATION_DETAILS}>
      <Text style={ROUTE_STATION_NAME}>בית יהושוע</Text>
      <Text>רציף 3</Text>
    </View>
  </View>
)
