import React from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { Screen, Text, RouteDetailsHeader } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"

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
      <RouteDetailsHeader originId={routePlan.origin.id} destinationId={routePlan.destination.id} />
    </Screen>
  )
})
