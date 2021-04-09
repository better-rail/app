import React, { useEffect, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { View, FlatList, Image, ViewStyle, TextStyle, ImageStyle, ActivityIndicator } from "react-native"
import { RouteListScreenProps } from "../../navigators/main-navigator"
import { Screen, Text, RouteCard, RouteCardHeight } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import { format, closestIndexTo } from "date-fns"
import { RouteItem } from "../../services/api"
import { otherwise } from "ramda"

const arrowIcon = require("../../../assets/arrow-left.png")

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
  marginTop: spacing[3],
}

export const RouteListScreen = observer(function RouteListScreen({ route }: RouteListScreenProps) {
  const { trainRoute } = useStores()

  // Set the initial scroll index, since the Israel Rail API ignores the supplied time and
  // returns a route list for the whole day.
  const initialScrollIndex = useMemo(() => {
    if (trainRoute.state === "loaded") {
      const departureTimes = trainRoute.routes.map((route) => Date.parse(route.arrivalTime))
      // Doesn't work, always returns 0
      const index = closestIndexTo(route.params.time, departureTimes)
      return index
    }
    return undefined
  }, [trainRoute.state])

  useEffect(() => {
    const { originId, destinationId, time } = route.params

    // Format times for Israel Rail API
    const date = format(time, "yyyyMMdd")
    const hour = format(time, "HHmm")

    trainRoute.getRoutes(originId, destinationId, date, hour)
  }, [route.params])

  const renderRouteCard = ({ item }: { item: RouteItem }) => {
    const departureTime = item.trains[0].departureTime
    let arrivalTime = item.trains[0].arrivalTime
    let stops = 0

    if (item.isExchange) {
      stops = item.trains.length
      arrivalTime = item.trains[stops - 1].arrivalTime
    }
    console.log(item.estTime)
    return (
      <RouteCard
        estTime={item.estTime}
        stops={stops}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        style={{ marginBottom: spacing[3] }}
      />
    )
  }

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBar="dark-content">
      <RouteDetails style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }} />
      {trainRoute.state === "loading" || initialScrollIndex === undefined ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          renderItem={renderRouteCard}
          keyExtractor={(item) => item.trains[0].departureTime}
          data={trainRoute.routes}
          contentContainerStyle={{ paddingHorizontal: spacing[3] }}
          getItemLayout={(_, index) => ({ length: RouteCardHeight, offset: RouteCardHeight * index + spacing[3], index })}
        />
      )}
    </Screen>
  )
})

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

const RouteDetails = ({ style }) => (
  <View style={[ROUTE_DETAILS_WRAPPER, style]}>
    <View style={[ROUTE_DETAILS_STATION, { marginRight: spacing[5] }]}>
      <Text style={ROUTE_DETAILS_STATION_TEXT}>ירושלים - יצחק נבון</Text>
    </View>
    <View style={ROUTE_INFO_CIRCLE}>
      <Image source={arrowIcon} style={ARROW_ICON} />
    </View>
    <View style={ROUTE_DETAILS_STATION}>
      <Text style={ROUTE_DETAILS_STATION_TEXT}>תל אביב - ההגנה</Text>
    </View>
  </View>
)
