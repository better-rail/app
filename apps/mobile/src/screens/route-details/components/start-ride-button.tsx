import { Alert, Dimensions, Image, Linking, Platform, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { Button } from "@/components"
import { translate, userLocale } from "@/i18n"
import type { RouteItem } from "@/services/api"
import { differenceInMinutes } from "date-fns"
import { isRouteInThePast, timezoneCorrection } from "@/utils/helpers/date-helpers"
import { fontScale } from "@/theme"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models"
import { trackEvent } from "@/services/analytics"
import { requestStoreReview } from "@/utils/helpers/store-review-helpers"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"

const { width: deviceWidth } = Dimensions.get("screen")

interface StartRideButtonProps {
  route: RouteItem
  screenName: "routeDetails" | "activeRide"
}

export function StartRideButton(props: StartRideButtonProps) {
  const { theme } = useUnistyles()
  const router = useRouter()
  const ride = useRideStore(
    useShallow((s) => ({
      id: s.id,
      canRunLiveActivities: s.canRunLiveActivities,
      activityAuthorizationInfo: s.activityAuthorizationInfo,
      notificationPermissionState: s.notificationPermissionState,
      loading: s.loading,
      rideCount: s.rideCount,
      startRide: s.startRide,
      stopRide: s.stopRide,
    })),
  )

  const { route, screenName } = props

  if (deviceWidth > 768 && screenName !== "routeDetails") return null

  const isRouteInPast = isRouteInThePast(route.arrivalTime, route.delay)
  const isRouteInFuture =
    differenceInMinutes(route.departureTime + route.delay * 60000, timezoneCorrection(new Date()).getTime()) > 60

  const areActivitiesDisabled = Platform.select({
    ios: () => !ride.canRunLiveActivities || !(ride?.activityAuthorizationInfo?.areActivitiesEnabled ?? true),
    android: () =>
      !ride.canRunLiveActivities ||
      !ride.notificationPermissionState?.granted ||
      !ride.notificationPermissionState?.canScheduleExactAlarms,
    default: () => false,
  })

  const isStartRideButtonDisabled = isRouteInFuture || isRouteInPast || areActivitiesDisabled()

  const startRide = async () => {
    const activeRideId = useRideStore.getState().id
    if (activeRideId) {
      return Alert.alert(translate("ride.rideExistsTitle"), translate("ride.rideExistsMessage"), [
        {
          style: "cancel",
          text: translate("common.cancel"),
        },
        {
          text: translate("ride.startNewRide"),
          onPress: async () => {
            await ride.stopRide(activeRideId)
            return startRide()
          },
        },
      ])
    }

    HapticFeedback.trigger("notificationSuccess")
    ride.startRide(route)
    trackEvent("start_live_ride")

    if (ride.rideCount === 3) {
      requestStoreReview().then(() => {
        trackEvent("start_live_ride_in_app_review_prompt")
      })
    }
  }

  return (
    <View style={styles.startRideButton}>
      <Button
        variant="secondary"
        style={{
          backgroundColor: theme.colors.secondary,
          width: Platform.OS === "ios" && userLocale === "he" ? 160 * Math.min(fontScale, 1.2) : 148 * Math.min(fontScale, 1.2),
        }}
        icon={
          Platform.OS === "android" ? undefined : (
            <Image source={require("../../../../assets/train.ios.png")} style={styles.trainIcon} />
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
            disabledReason = Platform.OS === "ios" ? "Live Activities disabled" : "Notifications disabled"

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
              useNavigationParamsStore.getState().setRouteItem(route)
              router.push("/live-permissions")
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

const styles = StyleSheet.create((theme, rt) => ({
  startRideButton: {
    elevation: 4,
  },
  trainIcon: {
    width: 22.5,
    height: 14,
    tintColor: "white",
    transform: [{ rotateY: rt.rtl ? "180deg" : "0deg" }],
  },
}))
