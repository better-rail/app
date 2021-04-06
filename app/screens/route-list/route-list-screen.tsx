import React from "react"
import { observer } from "mobx-react-lite"
import { View, Image, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { Screen, Text, RouteCard } from "../../components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../../models"
import { color, spacing } from "../../theme"

const arrowIcon = require("../../../assets/arrow-left.png")

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
  marginTop: spacing[3],
  paddingHorizontal: spacing[3],
}

export const RouteListScreen = observer(function RouteListScreen() {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBar="dark-content">
      <RouteDetails style={{ marginBottom: spacing[3] }} />
      <RouteCard />
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
  width: 39,
  height: 39,
  position: "absolute",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: color.secondary,
  borderRadius: 25,
}

const ARROW_ICON: ImageStyle = {
  width: 18,
  height: 18,
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
