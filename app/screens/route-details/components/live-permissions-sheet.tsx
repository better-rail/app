import { forwardRef } from "react"
import { Image, PermissionsAndroid, TextStyle, View, ViewStyle } from "react-native"
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"
import { Button, Text } from "../../../components"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { color, spacing } from "../../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "../../../i18n"
import { useStores } from "../../../models"
import notifee, { AndroidNotificationSetting, AuthorizationStatus } from "@notifee/react-native"
import { observer } from "mobx-react-lite"

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

type Props = {
  onDone: () => void
}

export const LivePermissionsSheet = observer(
  forwardRef<BottomSheet, Props>((props, ref) => {
    const { ride } = useStores()

    const grantNotifications = async () => {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      return ride.checkLiveRideAuthorization()
    }

    const grantAlarms = () => {
      notifee.openAlarmPermissionSettings()
    }

    return (
      <BottomSheetModal ref={ref} enableDynamicSizing>
        <BottomSheetView style={WRAPPER}>
          <Text tx="ride.notificationPermission1" style={TEXT} />
          <Text tx="ride.notificationPermission2" style={TEXT} />

          <View style={{ width: "100%", gap: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }} tx="ride.notificationPermission3" />
              <PermissionButton
                onPress={grantNotifications}
                permitted={ride.notifeeSettings?.notifications === AuthorizationStatus.AUTHORIZED}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }} tx="ride.notificationPermission4" />
              <PermissionButton
                onPress={grantAlarms}
                permitted={ride.notifeeSettings?.alarms === AndroidNotificationSetting.ENABLED}
              />
            </View>
          </View>
          <Button
            onPress={props.onDone}
            title={translate("liveAnnounce.startRide.title")}
            containerStyle={{ width: "100%", maxHeight: 60 }}
            disabled={
              ride.notifeeSettings?.notifications !== AuthorizationStatus.AUTHORIZED ||
              ride.notifeeSettings?.alarms !== AndroidNotificationSetting.ENABLED
            }
          />
        </BottomSheetView>
      </BottomSheetModal>
    )
  }),
)

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
      onPress={!permitted && onPress}
    >
      {!permitted ? (
        <Text preset="bold" style={{ color: color.whiteText }} tx="common.allow" />
      ) : (
        <Image source={CHECKMARK_ICON} style={{ width: 30, height: 30, tintColor: "white" }} />
      )}
    </TouchableOpacity>
  )
}
