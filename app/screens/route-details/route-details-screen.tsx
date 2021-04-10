import React from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { RouteDetailsHeader, Screen } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { RouteStationCard, RouteStopCard } from "./"

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
              {/* {train.stopStations.length > 0 && <RouteLine />} */}
              <RouteStationCard
                stationName={train.destinationStationName}
                stopTime={format(train.arrivalTime, "HH:mm")}
                platform={train.destinationPlatform}
                style={{ marginTop: spacing[2] }}
              />
            </>
          )
        })}
      </ScrollView>
    </Screen>
  )
})
