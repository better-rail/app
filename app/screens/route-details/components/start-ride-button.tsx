import { Alert, Dimensions, Image, ImageStyle, Linking, PermissionsAndroid, Platform, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import * as storage from "../../../utils/storage"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import analytics from "@react-native-firebase/analytics"
import crashlytics from "@react-native-firebase/crashlytics"
import { Button } from "../../../components"
import { isRTL, translate } from "../../../i18n"
import { RouteItem } from "../../../services/api"
import { differenceInMinutes, isAfter } from "date-fns"
import { timezoneCorrection } from "../../../utils/helpers/date-helpers"
import { color, fontScale } from "../../../theme"
import { useStores } from "../../../models"
import { canRunLiveActivities } from "../../../utils/ios-helpers"

const { width: deviceWidth } = Dimensions.get("screen")

// Those who know know.
const currentDate = new Date() // Get the current date and time in the local time zone
const targetDate = new Date(2023, 5, 11, 17) // Set the date to June 11th at 17:00
const isAfterTargetDate = isAfter(currentDate, targetDate)

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
  openFirstRideAlertSheet?: () => void
}

export const StartRideButton = observer(function StartRideButton(props: StartRideButtonProps) {
  const { ride } = useStores()

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
  const areActivitiesDisabled = Platform.select({
    ios: () => !canRunLiveActivities || !(ride?.activityAuthorizationInfo?.areActivitiesEnabled ?? true),
    android: () => {
      const result = PermissionsAndroid.RESULTS[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]
      return result && result !== "granted"
    },
  })
  const isStartRideButtonDisabled = isRouteInFuture || isRouteInPast || areActivitiesDisabled() || activeRide

  const shouldDisplayFirstRideAlert = async () => {
    const isFirstRideAlertEnabled = isAfterTargetDate
    if (!isFirstRideAlertEnabled) return false

    const firstRideDate = await storage.load("firstRideDate")

    if (!firstRideDate) {
      await storage.save("firstRideDate", new Date().toISOString())
      return true
    }

    return false
  }

  return (
    <View
      style={{
        position: "absolute",
        ...START_RIDE_BUTTON,
        bottom: insets.bottom > 0 ? insets.bottom + 5 : 15,
        right: 15 + insets.right,
      }}
    >
      <Button
        style={{ backgroundColor: color.secondary, width: 148 * fontScale }}
        icon={
          Platform.OS == "android" ? undefined : <Image source={require("../../../../assets/train.ios.png")} style={TRAIN_ICON} />
        }
        pressedOpacity={0.85}
        title={translate("ride.startRide")}
        loading={ride.loading}
        disabled={isStartRideButtonDisabled}
        onDisabledPress={() => {
          HapticFeedback.trigger("notificationError")
          let disabledReason = ""
          if (activeRide) {
            disabledReason = "Active ride already exists"
            Alert.alert(translate("ride.rideExistsTitle"), translate("ride.rideExistsMessage"))
          } else if (areActivitiesDisabled()) {
            disabledReason = Platform.OS === "ios" ? "Live Activities disabled" : "Notifications disbled"
            const alertTitle =
              Platform.OS === "ios" ? translate("ride.liveActivitiesDisabledTitle") : translate("ride.notificationsDisabledTitle")
            const alertMessage =
              Platform.OS === "ios"
                ? translate("ride.liveActivitiesDisabledMessage")
                : translate("ride.notificationsDisabledMessage")
            Alert.alert(alertTitle, alertMessage, [
              {
                style: "cancel",
                text: translate("common.cancel"),
              },
              {
                text: translate("settings.title"),
                onPress: () => Linking.openSettings(),
              },
            ])
          } else {
            let message = ""
            if (isRouteInPast) {
              disabledReason = "Route in past"
              message = translate("ride.rideInPastAlert")
            } else if (isRouteInFuture) {
              disabledReason = "Route in future"
              message = translate("ride.rideInFutureAlert")
            }

            Alert.alert(message)
          }

          analytics().logEvent("start_live_ride_disabled_press", {
            reason: disabledReason,
          })
        }}
        onPress={async () => {
          crashlytics().log("Start ride button pressed")
          crashlytics().setAttributes({
            route: JSON.stringify(route),
            rideId: ride.id ?? "null",
          })

          if (Platform.OS === "ios") {
            shouldDisplayFirstRideAlert().then((isFirstRide) => {
              if (isFirstRide) {
                props.openFirstRideAlertSheet()
                analytics().logEvent("first_live_ride_alert")
              }
            })
          } else if (Number(Platform.Version) >= 33) {
            const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
            if (result !== "granted") return
          }

          HapticFeedback.trigger("notificationSuccess")
          ride.startRide(route)
          analytics().logEvent("start_live_ride")
        }}
      />
    </View>
  )
})
