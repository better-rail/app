import { Alert, Dimensions, Image, ImageStyle, Linking, Platform, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"
import { Button } from "../../../components"
import { isRTL, translate, userLocale } from "../../../i18n"
import type { RouteItem } from "../../../services/api"
import { differenceInMinutes } from "date-fns"
import { isRouteInThePast, timezoneCorrection } from "../../../utils/helpers/date-helpers"
import { color, fontScale } from "../../../theme"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "../../../models"
import { AndroidNotificationSetting, AuthorizationStatus } from "@notifee/react-native"
import InAppReview from "react-native-in-app-review"
import { trackEvent } from "../../../services/analytics"

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
  openPermissionsSheet?: () => Promise<unknown>
}

export function StartRideButton(props: StartRideButtonProps) {
  const ride = useRideStore(
    useShallow((s) => ({
      id: s.id,
      canRunLiveActivities: s.canRunLiveActivities,
      activityAuthorizationInfo: s.activityAuthorizationInfo,
      notifeeSettings: s.notifeeSettings,
      loading: s.loading,
      rideCount: s.rideCount,
      startRide: s.startRide,
      stopRide: s.stopRide,
    }))
  )

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
  const isRouteInPast = isRouteInThePast(route.arrivalTime, route.delay)
  const isRouteInFuture =
    differenceInMinutes(route.departureTime + route.delay * 60000, timezoneCorrection(new Date()).getTime()) > 60

  const areActivitiesDisabled = Platform.select({
    ios: () => !ride.canRunLiveActivities || !(ride?.activityAuthorizationInfo?.areActivitiesEnabled ?? true),
    android: () =>
      ride.notifeeSettings?.notifications !== AuthorizationStatus.AUTHORIZED ||
      ride.notifeeSettings?.alarms !== AndroidNotificationSetting.ENABLED,
  })

  const isStartRideButtonDisabled = isRouteInFuture || isRouteInPast || areActivitiesDisabled()

  const startRide = async () => {
    if (ride.id) {
      return Alert.alert(translate("ride.rideExistsTitle"), translate("ride.rideExistsMessage"), [
        {
          style: "cancel",
          text: translate("common.cancel"),
        },
        {
          text: translate("ride.startNewRide"),
          onPress: async () => {
            await ride.stopRide(ride.id)
            return startRide()
          },
        },
      ])
    }

    HapticFeedback.trigger("notificationSuccess")
    ride.startRide(route)
    trackEvent("start_live_ride")

    // in reality the prompt would be shown on the 4th ride and not the 3rd, since the count
    // will be increased only after the ride has been started successfully.
    if (ride.rideCount === 3) {
      InAppReview.RequestInAppReview().then(() => {
        trackEvent("start_live_ride_in_app_review_prompt")
      })
    }
  }

  return (
    <View
      style={{
        ...START_RIDE_BUTTON,
        // right: 15 + insets.right,
      }}
    >
      <Button
        variant="secondary"
        style={{
          backgroundColor: color.secondary,
          width: Platform.OS === "ios" && userLocale === "he" ? 160 * fontScale : 148 * fontScale,
        }}
        icon={
          Platform.OS === "android" ? undefined : (
            <Image source={require("../../../../assets/train.ios.png")} style={TRAIN_ICON} />
          )
        }
        pressedOpacity={0.85}
        title={translate("ride.startRide")}
        loading={ride.loading}
        disabled={isStartRideButtonDisabled}
        onPress={startRide}
        onDisabledPress={() => {
          HapticFeedback.trigger("notificationError")
          let disabledReason = ""
          if (areActivitiesDisabled()) {
            disabledReason = Platform.OS === "ios" ? "Live Activities disabled" : "Notifications disbled"

            if (Platform.OS === "ios") {
              const alertTitle = translate("ride.liveActivitiesDisabledTitle")
              const alertMessage = translate("ride.liveActivitiesDisabledMessage")
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
              props.openPermissionsSheet().then(startRide)
            }
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

          trackEvent("start_live_ride_disabled_press", {
            reason: disabledReason,
          })
        }}
      />
    </View>
  )
}
