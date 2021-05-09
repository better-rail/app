import React from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { Screen, Text, RouteDetails } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import TouchableScale from "react-native-touchable-scale"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  padding: spacing[4],
  flex: 1,
}

export const FavoritesScreen = observer(function FavoritesScreen() {
  // Pull in one of our MST stores
  const { routePlan } = useStores()

  return (
    <Screen style={ROOT} unsafe={true} preset="scroll">
      <PressableRouteDetails originId={routePlan.origin.id} destinationId={routePlan.destination.id} />
      <PressableRouteDetails originId={routePlan.destination.id} destinationId={routePlan.origin.id} />
    </Screen>
  )
})

const PressableRouteDetails = (props) => (
  <TouchableScale activeScale={0.97} friction={9} style={{ marginBottom: 30 }}>
    <RouteDetails
      originId={props.originId}
      destinationId={props.destinationId}
      imageStyle={{ borderRadius: 6, overflow: "hidden" }}
    />
  </TouchableScale>
)
