import { Alert, Image, PermissionsAndroid, View, type TextStyle, type ViewStyle } from "react-native"
import { Button, Text } from "../../../components"
import { color, spacing } from "../../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "../../../i18n"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "../../../models"
import notifee, { AndroidNotificationSetting, AuthorizationStatus } from "@notifee/react-native"
import HapticFeedback from "react-native-haptic-feedback"
import { trackEvent } from "../../../services/analytics"
import InAppReview from "react-native-in-app-review"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import type { PrimaryParamList } from "../../../navigators/main-navigator"

const WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  paddingTop: spacing[5],
  alignItems: "center",
  gap: 16,
  flex: 1,
  backgroundColor: color.background,
}

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.text,
}

const PERMISSION_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const PERMISSION_LABEL: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
}

type Props = NativeStackScreenProps<PrimaryParamList, "livePermissions">

export function LivePermissionsScreen({ route, navigation }: Props) {
  const { notifeeSettings, checkLiveRideAuthorization, startRide, stopRide, id: rideId, rideCount } = useRideStore(
    useShallow((s) => ({
      notifeeSettings: s.notifeeSettings,
      checkLiveRideAuthorization: s.checkLiveRideAuthorization,
      startRide: s.startRide,
      stopRide: s.stopRide,
      id: s.id,
      rideCount: s.rideCount,
    })),
  )

  const { routeItem } = route.params

  const grantNotifications = async () => {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    return checkLiveRideAuthorization()
  }

  const grantAlarms = () => {
    notifee.openAlarmPermissionSettings()
  }

  const beginRide = () => {
    HapticFeedback.trigger("notificationSuccess")
    startRide(routeItem)
    trackEvent("start_live_ride")

    if (rideCount === 3) {
      InAppReview.RequestInAppReview().then(() => {
        trackEvent("start_live_ride_in_app_review_prompt")
      })
    }

    navigation.goBack()
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
    <View style={WRAPPER}>
      <Text tx="ride.notificationPermission1" style={TEXT} />
      <Text tx="ride.notificationPermission2" style={TEXT} />

      <View style={{ width: "100%", gap: 20 }}>
        <View style={PERMISSION_ROW}>
          <Text style={PERMISSION_LABEL} tx="ride.notificationPermission3" />
          <PermissionButton
            onPress={grantNotifications}
            permitted={notifeeSettings?.notifications === AuthorizationStatus.AUTHORIZED}
          />
        </View>
        <View style={PERMISSION_ROW}>
          <Text style={PERMISSION_LABEL} tx="ride.notificationPermission4" />
          <PermissionButton
            onPress={grantAlarms}
            permitted={notifeeSettings?.alarms === AndroidNotificationSetting.ENABLED}
          />
        </View>
      </View>
      <Button
        onPress={onStartRide}
        title={translate("liveAnnounce.startRide.title")}
        containerStyle={{ width: "100%" }}
        disabled={
          notifeeSettings?.notifications !== AuthorizationStatus.AUTHORIZED ||
          notifeeSettings?.alarms !== AndroidNotificationSetting.ENABLED
        }
      />
    </View>
  )
}

const PERMISSION_BUTTON_WRAPPER: ViewStyle = {
  width: 120,
  height: 50,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 6,
}

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

const PermissionButton = ({ permitted = false, onPress = () => {} }) => {
  const backgroundColor = permitted ? color.success : color.primaryDarker

  return (
    <TouchableOpacity
      style={[PERMISSION_BUTTON_WRAPPER, { backgroundColor }]}
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
