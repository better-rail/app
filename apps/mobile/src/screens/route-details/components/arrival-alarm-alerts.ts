import { Alert, Linking, Platform } from "react-native"
import { translate } from "@/i18n"
import type { EnableArrivalAlarmResult } from "@/models/ride/arrival-alarm"
import { openArrivalAlarmSettings } from "@/utils/arrival-alarm-native"

const openSettingsAlert = (title: string, message: string, openSettings: () => void = () => Linking.openSettings()) =>
  Alert.alert(title, message, [
    { style: "cancel", text: translate("common.cancel") },
    { text: translate("settings.title"), onPress: openSettings },
  ])

export const showEnableArrivalAlarmResult = (result: EnableArrivalAlarmResult, leadMinutes: number) => {
  if (result === "tooLate") {
    Alert.alert(translate("ride.alarmTooLateTitle"), translate("ride.alarmTooLateMessage", { minutes: leadMinutes }))
  } else if (result === "denied" && Platform.OS === "android") {
    // Exact alarms and notifications each have their own screen, which the native module picks.
    openSettingsAlert(translate("ride.alarmDeniedTitle") ?? "", translate("ride.alarmDeniedMessageAndroid") ?? "", () =>
      openArrivalAlarmSettings("permissions"),
    )
  } else if (result === "denied") {
    openSettingsAlert(translate("ride.alarmDeniedTitle"), translate("ride.alarmDeniedMessage"))
  } else if (result === "enabledWithoutUpdates") {
    openSettingsAlert(translate("ride.alarmNoUpdatesTitle"), translate("ride.alarmNoUpdatesMessage"))
  } else if (result === "enabledWithoutFullScreen") {
    openSettingsAlert(translate("ride.alarmFullScreenTitle") ?? "", translate("ride.alarmFullScreenMessage") ?? "", () =>
      openArrivalAlarmSettings("fullScreen"),
    )
  } else if (result === "failed") {
    Alert.alert(translate("ride.alarmFailed"))
  }
}
