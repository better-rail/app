import { Alert, Image, PermissionsAndroid, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Text } from "@/components"
import { color } from "@/theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "@/i18n"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models"
import notifee, { AndroidNotificationSetting, AuthorizationStatus } from "@notifee/react-native"
import HapticFeedback from "react-native-haptic-feedback"
import { trackEvent } from "@/services/analytics"
import { requestStoreReview } from "@/utils/helpers/store-review-helpers"
import { useRouter } from "expo-router"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"

export function LivePermissionsScreen() {
  const router = useRouter()
  const routeItem = useNavigationParamsStore((s) => s.routeItem)
  const {
    notifeeSettings,
    checkLiveRideAuthorization,
    startRide,
    stopRide,
    id: rideId,
    rideCount,
  } = useRideStore(
    useShallow((s) => ({
      notifeeSettings: s.notifeeSettings,
      checkLiveRideAuthorization: s.checkLiveRideAuthorization,
      startRide: s.startRide,
      stopRide: s.stopRide,
      id: s.id,
      rideCount: s.rideCount,
    })),
  )

  const grantNotifications = async () => {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    return checkLiveRideAuthorization()
  }

  const grantAlarms = () => {
    notifee.openAlarmPermissionSettings()
  }

  const beginRide = () => {
    if (!routeItem) return
    HapticFeedback.trigger("notificationSuccess")
    startRide(routeItem)
    trackEvent("start_live_ride")

    if (rideCount === 3) {
      requestStoreReview().then(() => {
        trackEvent("start_live_ride_in_app_review_prompt")
      })
    }

    router.back()
  }

  const onStartRide = () => {
    if (rideId) {
      Alert.alert(translate("ride.rideExistsTitle"), translate("ride.rideExistsMessage"), [
        {
          style: "cancel",
          text: translate("common.cancel"),
        },
        {
          text: translate("ride.startNewRide"),
          onPress: async () => {
            await stopRide(rideId)
            beginRide()
          },
        },
      ])
      return
    }

    beginRide()
  }

  return (
    <View style={styles.wrapper}>
      <Text tx="ride.notificationPermission1" style={styles.text} />
      <Text tx="ride.notificationPermission2" style={styles.text} />

      <View style={{ width: "100%", gap: 20 }}>
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel} tx="ride.notificationPermission3" />
          <PermissionButton
            onPress={grantNotifications}
            permitted={notifeeSettings?.notifications === AuthorizationStatus.AUTHORIZED}
          />
        </View>
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel} tx="ride.notificationPermission4" />
          <PermissionButton onPress={grantAlarms} permitted={notifeeSettings?.alarms === AndroidNotificationSetting.ENABLED} />
        </View>
      </View>
      <Button
        onPress={onStartRide}
        title={translate("liveAnnounce.startRide.title")}
        containerStyle={{ width: "100%", height: 60, flex: 0 }}
        disabled={
          notifeeSettings?.notifications !== AuthorizationStatus.AUTHORIZED ||
          notifeeSettings?.alarms !== AndroidNotificationSetting.ENABLED
        }
      />
    </View>
  )
}

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

const PermissionButton = ({ permitted = false, onPress = () => {} }) => {
  const backgroundColor = permitted ? color.success : color.primaryDarker

  return (
    <TouchableOpacity
      style={[styles.permissionButtonWrapper, { backgroundColor }]}
      activeOpacity={0.9}
      onPress={permitted ? undefined : onPress}
    >
      {!permitted ? (
        <Text preset="bold" style={{ color: color.whiteText }} tx="common.allow" />
      ) : (
        <Image source={CHECKMARK_ICON} style={{ width: 30, height: 30, tintColor: "white" }} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    minHeight: 420,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    alignItems: "center",
    gap: 16,
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    color: theme.colors.text,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  permissionLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  permissionButtonWrapper: {
    width: 120,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
}))
