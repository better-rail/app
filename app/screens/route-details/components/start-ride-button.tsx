import { Alert, Dimensions, Image, ImageStyle, Platform, PlatformColor, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import analytics from "@react-native-firebase/analytics"
import { Button } from "../../../components"
import { isRTL, translate } from "../../../i18n"
import { RouteItem } from "../../../services/api"
import { differenceInMinutes, isAfter } from "date-fns"
import { timezoneCorrection } from "../../../utils/helpers/date-helpers"
import { color } from "../../../theme"
import { useStores } from "../../../models"
import { useNavigation } from "@react-navigation/native"

const { width: deviceWidth } = Dimensions.get("screen")

const START_RIDE_BUTTON: ViewStyle = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  shadowColor: "#333",
  elevation: 4,
}

const TRAIN_ICON: ImageStyle = {
  width: 22.5,
  height: 14,
  tintColor: "white",
  transform: [{ rotateY: isRTL ? "180deg" : "0deg" }],
}

interface StartRideButtonProps {
  route: RouteItem
  screenName: "routeDetails" | "activeRide"
}

export const StartRideButton = observer(function StartRideButton(props: StartRideButtonProps) {
  const navigation = useNavigation()
  const { ride, purchases } = useStores()

  const { route, screenName } = props
  const insets = useSafeAreaInsets()

  /*
   * Check that the device isn't a tablet.
   * The user can only initiate a ride from the route details screen.
   */
  if (deviceWidth > 768 && screenName !== "routeDetails") return null

  /**
   * Check if the ride is 60 minutes away or less from now, and not after the arrival time.
   * We are also correcting the user's timezone to Asia/Jerusalem, so if foreign users are playing with the
   * feature, it'll allow them to start a ride as if they were at Israel at the moment.
   */
  const isRouteInPast = isAfter(timezoneCorrection(new Date()).getTime(), route.arrivalTime)
  const isRouteInFuture = differenceInMinutes(route.departureTime, timezoneCorrection(new Date()).getTime()) > 60

  const activeRide = !!ride.id
  const isStartRideButtonDisabled = isRouteInFuture || isRouteInPast || activeRide

  return (
    <View
      style={{
        position: "absolute",
        ...START_RIDE_BUTTON,
        bottom: insets.bottom > 0 ? insets.bottom + 5 : 15,
        right: 15 + insets.right,
      }}
    >
      {!purchases.isPro ? (
        <Button
          style={{ backgroundColor: PlatformColor("systemGreen"), width: 148 }}
          title="Live Ride"
          icon={
            <Image source={require("../../../../assets/lock.ios.png")} style={{ width: 13, height: 18, tintColor: "white" }} />
          }
          onPress={() => {
            HapticFeedback.trigger("impactMedium")
            analytics().logEvent("start_live_ride_paywall_press")
            navigation.navigate("paywallStack", { screen: "paywall", params: { presentation: "modal" } })
          }}
        />
      ) : (
        <Button
          style={{ backgroundColor: color.secondary, width: 148 }}
          icon={
            Platform.OS == "android" ? undefined : (
              <Image source={require("../../../../assets/train.ios.png")} style={TRAIN_ICON} />
            )
          }
          pressedOpacity={0.85}
          title={translate("ride.startRide")}
          loading={ride.loading}
          disabled={isStartRideButtonDisabled}
          onDisabledPress={() => {
            HapticFeedback.trigger("notificationError")
            analytics().logEvent("start_live_ride_disable_press")
            if (activeRide) {
              Alert.alert(translate("ride.rideExistsTitle"), translate("ride.rideExistsMessage"))
            } else {
              let message = ""
              if (isRouteInPast) {
                message = translate("ride.rideInPastAlert")
              } else if (isRouteInFuture) {
                message = translate("ride.rideInFutureAlert")
              }

              Alert.alert(message)
            }
          }}
          onPress={() => {
            HapticFeedback.trigger("notificationSuccess")
            ride.startRide(route)
            analytics().logEvent("start_live_ride")
          }}
        />
      )}
    </View>
  )
})
