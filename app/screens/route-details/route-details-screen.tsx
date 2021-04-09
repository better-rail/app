import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"

const ROOT: ViewStyle = {
  flex: 1,
  marginTop: spacing[3],
  backgroundColor: color.background,
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ route }: RouteDetailsScreenProps) {
  const { routeItem, originId, destinationId } = route.params
  console.log(routeItem.trains[0])
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <RouteDetailsHeader
        originId={originId}
        destinationId={destinationId}
        style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
      />
      <View>
        <Text preset="header" text="הי!" />
      </View>
    </Screen>
  )
})
