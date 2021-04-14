import React, { useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, ViewStyle, ActivityIndicator } from "react-native"
import { RouteListScreenProps } from "../../navigators/main-navigator"
import { Screen, RouteDetailsHeader, RouteCard, RouteCardHeight } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import { format, closestIndexTo } from "date-fns"
import { RouteItem } from "../../services/api"
import { RouteListModal } from "./components/route-list-modal"
import { SharedElement } from "react-navigation-shared-element"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
}

export const RouteListScreen = observer(function RouteListScreen({ navigation, route }: RouteListScreenProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const { trainRoute } = useStores()

  // Set the initial scroll index, since the Israel Rail API ignores the supplied time and
  // returns a route list for the whole day.
  const initialScrollIndex = useMemo(() => {
    if (trainRoute.state === "loaded") {
      const departureTimes = trainRoute.routes.map((route) => route.trains[0].departureTime)
      const index = closestIndexTo(route.params.time, departureTimes)
      return index
    }
    return undefined
  }, [trainRoute.state])

  useEffect(() => {
    const { originId, destinationId, time } = route.params

    trainRoute.getRoutes(originId, destinationId, time)
  }, [route.params])

  useEffect(() => {
    if (trainRoute.resultType === "different-date") {
      setIsModalVisible(true)
    }
  }, [trainRoute.resultType])

  const renderRouteCard = ({ item }: { item: RouteItem }) => {
    const departureTime = item.trains[0].departureTime
    let arrivalTime = item.trains[0].arrivalTime
    let stops = 0

    // If the train contains an exchange, change to arrival time to the last stop from the last train
    if (item.isExchange) {
      stops = item.trains.length - 1
      arrivalTime = item.trains[stops].arrivalTime
    }

    return (
      <RouteCard
        estTime={item.estTime}
        stops={stops}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        onPress={() =>
          navigation.navigate("routeDetails", {
            routeItem: item,
            originId: route.params.originId,
            destinationId: route.params.destinationId,
            date: format(route.params.time, "yyyyMMdd"),
            time: format(route.params.time, "HHmm"),
          })
        }
        style={{ marginBottom: spacing[3] }}
      />
    )
  }

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBar="light-content">
      <SharedElement id="route-header">
        <RouteDetailsHeader
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </SharedElement>
      {trainRoute.state === "loading" ? (
        <ActivityIndicator size="large" style={{ marginTop: spacing[3] }} />
      ) : (
        <FlatList
          renderItem={renderRouteCard}
          keyExtractor={(item) => item.trains[0]?.departureTime.toString()}
          data={trainRoute.routes}
          contentContainerStyle={{ paddingTop: spacing[4], paddingHorizontal: spacing[3], paddingBottom: spacing[3] }}
          getItemLayout={(_, index) => ({ length: RouteCardHeight, offset: (RouteCardHeight + spacing[3]) * index, index })}
          initialScrollIndex={initialScrollIndex}
        />
      )}
      <RouteListModal
        isVisible={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        routesDate={trainRoute.routes[0].departureTime}
      />
    </Screen>
  )
})
