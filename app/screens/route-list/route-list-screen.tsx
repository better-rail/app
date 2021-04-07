import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { View, FlatList, Image, ViewStyle, TextStyle, ImageStyle, ActivityIndicator } from "react-native"
import { RouteListScreenProps } from "../../navigators/main-navigator"
import { Screen, Text, RouteCard } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"

const arrowIcon = require("../../../assets/arrow-left.png")

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
  marginTop: spacing[3],
}

export const RouteListScreen = observer(function RouteListScreen({ route }: RouteListScreenProps) {
  const { trainRoute } = useStores()

  useEffect(() => {
    const { originId, destinationId, date, hour } = route.params
    trainRoute.getRoutes(originId, destinationId, date, hour)
  }, [route.params])

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBar="dark-content">
      <RouteDetails style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }} />
      {trainRoute.state === "loading" ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          renderItem={({ item }) => <RouteCard {...item} style={{ marginBottom: spacing[3] }} />}
          keyExtractor={(item) => item.departureTime}
          data={trainRoute.routes}
          contentContainerStyle={{ paddingHorizontal: spacing[3] }}
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
