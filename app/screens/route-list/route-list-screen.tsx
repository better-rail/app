import React, { useMemo } from "react"
import { View, ActivityIndicator, ViewStyle, Dimensions } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { observer } from "mobx-react-lite"
import { useNetInfo } from "@react-native-community/netinfo"
import { SharedElement } from "react-navigation-shared-element"
import { useQuery } from "react-query"
import { closestIndexTo } from "date-fns"
import { RouteListScreenProps } from "../../navigators/main-navigator"
import { useStores } from "../../models"
import { color, fontScale, spacing } from "../../theme"
import { RouteItem } from "../../services/api"
import { Screen, RouteDetailsHeader, RouteCard, RouteCardHeight, Text } from "../../components"
import { NoTrainsFoundMessage, NoInternetConnection, RouteListWarning, WarningType, DateScroll } from "./components"
import { flatMap, max, round } from "lodash"
import { translate } from "../../i18n"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
}

export const RouteListScreen = observer(function RouteListScreen({ navigation, route }: RouteListScreenProps) {
  const { trainRoutes, routePlan, ride } = useStores()
  const { originId, destinationId, time, enableQuery } = route.params

  const { isInternetReachable } = useNetInfo()
  const trains = useQuery(
    ["origin", originId, "destination", destinationId, "time", routePlan.date.getDate()],
    async () => {
      const result = await trainRoutes.getRoutes(originId, destinationId, time)
      return result
    },
    { enabled: enableQuery, retry: false },
  )

  // Set the initial scroll index, since the Israel Rail API ignores the supplied time and
  // returns a route list for the whole day.
  const initialScrollIndex = useMemo(() => {
    if (trains.isSuccess) {
      let index

      if (routePlan.dateType === "departure") {
        const departureTimes = trains.data.map((route) => route.trains[0].departureTime)
        index = closestIndexTo(route.params.time, departureTimes)
      } else if (routePlan.dateType === "arrival") {
        const arrivalTimes = trains.data.map((route) => route.trains[0].arrivalTime)
        index = closestIndexTo(route.params.time, arrivalTimes)
      }

      return index
    }

    return undefined
  }, [trains.isSuccess])

  const shouldShowDashedLine = useMemo(() => {
    const { width: deviceWidth } = Dimensions.get("screen")

    // Get the longest text for duration and delay that will be in the list
    const allTexts = flatMap(trains.data ?? [], ({ delay, duration }) => [
      delay > 0 ? (delay + " " + translate("routes.delayTime")).length : 0,
      duration.length,
    ])
    const maxTextLength = max(allTexts)

    // Check if there's enough space for the dashed line with that text
    const shouldShowDashedLineByTextLength = round(deviceWidth / fontScale / 30) >= maxTextLength

    /**
     * Show the dashed line only when all these conditions are matched:
     * - Device width is 360 or more
     * - Font Scale is 1.2 or less
     * - There's enough space for the dashed line with the longest duration/delay text
     */
    return fontScale <= 1.2 && deviceWidth >= 360 && shouldShowDashedLineByTextLength
  }, [trains.data])

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
        duration={item.duration}
        isMuchShorter={item.isMuchShorter}
        isMuchLonger={item.isMuchLonger}
        stops={stops}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        delay={item.delay}
        isActiveRide={ride.isRouteActive(item)}
        onPress={() =>
          navigation.navigate("routeDetails", {
            routeItem: item,
            originId: route.params.originId,
            destinationId: route.params.destinationId,
          })
        }
        shouldShowDashedLine={shouldShowDashedLine}
        style={{ marginBottom: spacing[3] }}
      />
    )
  }

  const shouldShowWarning =
    trains.isSuccess && trains.data?.length > 0 && ["different-date", "different-hour"].includes(trainRoutes.resultType)

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <SharedElement id="route-header">
        <RouteDetailsHeader
          screenName="routeList"
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </SharedElement>

      {!isInternetReachable && !trains.data && <NoInternetConnection />}

      {trains.status === "loading" && <ActivityIndicator size="large" style={{ marginTop: spacing[6] }} color="grey" />}

      {trains.status === "success" && trains.data.length > 0 && (
        <FlashList
          renderItem={renderRouteCard}
          keyExtractor={(item) => item.trains.map((train) => train.trainNumber).join()}
          data={trains.data}
          contentContainerStyle={{
            paddingTop: spacing[4],
            paddingHorizontal: spacing[3],
            paddingBottom: shouldShowWarning ? spacing[8] + 12 : spacing[3],
          }}
          estimatedItemSize={RouteCardHeight + spacing[3]}
          initialScrollIndex={initialScrollIndex}
          // so the list will re-render when the ride route changes, and so the item will be marked
          extraData={ride.route}
        />
      )}

      {trainRoutes.resultType === "not-found" && (
        <View style={{ marginTop: spacing[4] }}>
          <NoTrainsFoundMessage />
        </View>
      )}

      {shouldShowWarning && (
        <RouteListWarning
          routesDate={trains.data[0].trains[0].departureTime}
          warningType={trainRoutes.resultType as WarningType}
        />
      )}

      <DateScroll />
    </Screen>
  )
})
