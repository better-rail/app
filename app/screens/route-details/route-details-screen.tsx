import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { RouteDetailsHeader, Screen } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { RouteStationCard, RouteStopCard } from "./components"

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
        {routeItem.trains.map((train, index) => {
          return (
            <>
              <RouteStationCard
                stationName={train.originStationName}
                stopTime={format(train.departureTime, "HH:mm")}
                platform={train.originPlatform}
              />

              {train.stopStations.length > 0
                ? train.stopStations.map((stop, index) => (
                    <>
                      {index === 0 && <RouteLine />}
                      <RouteStopCard
                        stationName={stop.stationName}
                        stopTime={format(stop.departureTime, "HH:mm")}
                        key={stop.stationId}
                        style={{ zIndex: 20 - index }}
                      />
                      {train.stopStations.length - 1 === index && <RouteLine />}
                    </>
                  ))
                : train.stopStations.length === 0 && <RouteLine height={30} />}

              <RouteStationCard
                stationName={train.destinationStationName}
                stopTime={format(train.arrivalTime, "HH:mm")}
                platform={train.destinationPlatform}
              />

              {routeItem.isExchange && routeItem.trains.length - 1 !== index && (
                <View style={{ height: 50, width: "100%", backgroundColor: "red" }} />
              )}
            </>
          )
        })}
      </ScrollView>
    </Screen>
  )
})

const RouteLine = ({ height = 10 }: { height?: number }) => (
  <View style={{ start: "35.44%", width: 4, height, backgroundColor: color.dim, zIndex: 0 }} />
)
