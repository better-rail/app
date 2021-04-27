import React, { useMemo } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { RouteDetailsHeader, Screen } from "../../components"
import { RouteDetailsScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SharedElement } from "react-navigation-shared-element"
import { ScrollView } from "react-native-gesture-handler"
import { format } from "date-fns"
import { useStores } from "../../models"
import { RouteStationCard, RouteStopCard, RouteExchangeDetails } from "./components"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
}

export const RouteDetailsScreen = observer(function RouteDetailsScreen({ navigation, route }: RouteDetailsScreenProps) {
  const { voucherDetails, vouchers, trainRoutes } = useStores()
  const { routeItem, date, time } = route.params
  const firstTrain = routeItem.trains[0]
  const insets = useSafeAreaInsets()

  const exisitingVoucher = useMemo(() => {
    // Check if there's an existing voucher for the route.
    const voucher = vouchers.list.find((voucher) => voucher.id === `${firstTrain.trainNumber}${firstTrain.departureTime}`)

    if (voucher) return voucher
    return undefined
  }, [vouchers.list.length, firstTrain])

  const onOrderVoucherPress = () => {
    // We keep the index becuase of https://github.com/guytepper/better-rail/issues/26
    const routeIndex = trainRoutes.routes.findIndex(
      (route) => route.trains[0].departureTime === routeItem.trains[0].departureTime,
    )

    voucherDetails.setRouteIndex(routeIndex)

    navigation.navigate("secondaryStack", { screen: "voucherForm" })
  }

  const onExistingVoucherPress = () => {
    console.log("hi..")
    navigation.navigate("secondaryStack", {
      screen: "voucherBarcode",
      props: { ...exisitingVoucher },
    })
  }

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
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </SharedElement>

      <ScrollView
        contentContainerStyle={{ paddingTop: spacing[4], paddingBottom: spacing[8] + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {routeItem.trains.map((train, index) => {
          return (
            <View key={train.trainNumber} style={{ backgroundColor: color.background }}>
              <RouteStationCard
                stationName={train.originStationName}
                stopTime={format(train.departureTime, "HH:mm")}
                platform={train.originPlatform}
                trainNumber={train.trainNumber}
              />

              {train.stopStations.length > 0
                ? train.stopStations.map((stop, index) => (
                    <>
                      {index === 0 && <RouteLine key={index} />}
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
                <RouteExchangeDetails
                  stationName={train.destinationStationName}
                  arrivalPlatform={train.destinationPlatform}
                  departurePlatform={routeItem.trains[index + 1].originPlatform}
                  arrivalTime={train.arrivalTime}
                  depatureTime={routeItem.trains[index + 1].departureTime}
                />
              )}
            </View>
          )
        })}
      </ScrollView>
    </Screen>
  )
})

const RouteLine = ({ height = 10 }: { height?: number }) => (
  <View style={{ start: "35.44%", width: 4, height, backgroundColor: color.separator, zIndex: 0 }} />
)
