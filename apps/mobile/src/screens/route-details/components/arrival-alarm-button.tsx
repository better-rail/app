import { Alert, Linking } from "react-native"
import HapticFeedback from "react-native-haptic-feedback"
import { Button, Host, Image, Menu, Section } from "@expo/ui/swift-ui"
import { accessibilityLabel, accessibilityValue, buttonBorderShape, buttonStyle, frame, tint } from "@expo/ui/swift-ui/modifiers"
import { useRideStore } from "@/models"
import {
  ARRIVAL_ALARM_LEAD_MINUTES,
  disableArrivalAlarm,
  enableArrivalAlarm,
  type EnableArrivalAlarmResult,
} from "@/models/ride/arrival-alarm"
import { translate } from "@/i18n"
import { formatTime } from "@/utils/helpers/date-helpers"

const openSettingsAlert = (title: string, message: string) =>
  Alert.alert(title, message, [
    { style: "cancel", text: translate("common.cancel") },
    { text: translate("settings.title"), onPress: () => Linking.openSettings() },
  ])

const showEnableResult = (result: EnableArrivalAlarmResult, leadMinutes: number) => {
  if (result === "tooLate") {
    Alert.alert(translate("ride.alarmTooLateTitle"), translate("ride.alarmTooLateMessage", { minutes: leadMinutes }))
  } else if (result === "denied") {
    openSettingsAlert(translate("ride.alarmDeniedTitle"), translate("ride.alarmDeniedMessage"))
  } else if (result === "enabledWithoutUpdates") {
    openSettingsAlert(translate("ride.alarmNoUpdatesTitle"), translate("ride.alarmNoUpdatesMessage"))
  } else if (result === "failed") {
    Alert.alert(translate("ride.alarmFailed"))
  }
}

/** Rings before the rider's stop. A native SwiftUI menu, so the glass reacts to touch. iOS 26+ only (AlarmKit). */
export function ArrivalAlarmButton() {
  const arrivalAlarm = useRideStore((s) => s.arrivalAlarm)

  const modifiers = [
    buttonStyle(arrivalAlarm ? "glassProminent" : "glass"),
    buttonBorderShape("circle"),
    accessibilityLabel(translate("ride.alarmButton") ?? ""),
    ...(arrivalAlarm ? [tint("orange"), accessibilityValue(formatTime(arrivalAlarm.fireDate))] : []),
  ]

  return (
    <Host matchContents>
      <Menu
        label={
          <Image
            systemName={arrivalAlarm ? "alarm.fill" : "alarm"}
            size={18}
            // The glass style adds 7pt of padding on each side, matching the 42.5pt stop button.
            modifiers={[frame({ width: 28.5, height: 28.5 })]}
          />
        }
        modifiers={modifiers}
      >
        <Section title={translate("ride.alarmMenuTitle") ?? ""}>
          {ARRIVAL_ALARM_LEAD_MINUTES.map((minutes) => (
            <Button
              key={minutes}
              label={translate("ride.alarmLeadOption", { minutes }) ?? ""}
              systemImage={arrivalAlarm?.leadMinutes === minutes ? "checkmark" : undefined}
              onPress={async () => {
                HapticFeedback.trigger("impactLight")
                showEnableResult(await enableArrivalAlarm(minutes), minutes)
              }}
            />
          ))}
        </Section>

        {arrivalAlarm && (
          <Button
            role="destructive"
            label={translate("ride.alarmTurnOff") ?? ""}
            systemImage="alarm"
            onPress={disableArrivalAlarm}
          />
        )}
      </Menu>
    </Host>
  )
}
