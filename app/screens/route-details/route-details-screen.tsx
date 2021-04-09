import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { RouteCard, RouteDetailsHeader, Screen, Text } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"

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
      <View style={{ paddingHorizontal: spacing[3] }}>
        <RouteCard
          departureTime={departureTime}
          arrivalTime={arrivalTime}
          estTime={routeItem.estTime}
          stops={stops}
          bounceable={false}
        />
        <Text preset="header" text="הי!" />
      </View>
    </Screen>
  )
})
