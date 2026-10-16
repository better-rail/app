import HapticFeedback from "react-native-haptic-feedback"
import { Button, Host, Image, Menu, Section } from "@expo/ui/swift-ui"
import {
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  disabled,
  frame,
  menuOrder,
  tint,
} from "@expo/ui/swift-ui/modifiers"
import { useRideStore } from "@/models"
import {
  ARRIVAL_ALARM_LEAD_MINUTES,
  disableArrivalAlarm,
  enableArrivalAlarm,
  toggleArrivalAlarmStopChoice,
} from "@/models/ride/arrival-alarm"
import { translate } from "@/i18n"
import { formatTime } from "@/utils/helpers/date-helpers"
import { getNextArrivalAlarmStop } from "@/utils/helpers/arrival-alarm-helpers"
import { showEnableArrivalAlarmResult } from "./arrival-alarm-alerts"
import { useArrivalAlarmStopOptions } from "./use-arrival-alarm-stop-options"

/** Rings before the rider's stops. A native SwiftUI menu, so the glass reacts to touch. iOS 26+ only (AlarmKit). */
export function ArrivalAlarmButton({ now }: { now: number }) {
  const arrivalAlarm = useRideStore((s) => s.arrivalAlarm)
  const stopOptions = useArrivalAlarmStopOptions(now)

  const modifiers = [
    buttonStyle(arrivalAlarm ? "glassProminent" : "glass"),
    buttonBorderShape("circle"),
    // Keeps the turn-off button last, where iOS would otherwise flip it to the top of a menu opening upward.
    menuOrder("fixed"),
    accessibilityLabel(translate("ride.alarmButton") ?? ""),
    ...(arrivalAlarm
      ? [tint("orange"), accessibilityValue(formatTime(getNextArrivalAlarmStop(arrivalAlarm.stops, now).fireDate))]
      : []),
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
                showEnableArrivalAlarmResult(await enableArrivalAlarm(minutes), minutes)
              }}
            />
          ))}
        </Section>

        {stopOptions.length > 0 && (
          <Section title={translate("ride.alarmStopsTitle") ?? ""}>
            {stopOptions.map((option) => (
              <Button
                key={option.train}
                label={option.title}
                systemImage={option.checked ? "checkmark" : undefined}
                modifiers={[disabled(option.disabled)]}
                onPress={async () => {
                  HapticFeedback.trigger("impactLight")
                  const result = await toggleArrivalAlarmStopChoice(option.train)
                  if (result && arrivalAlarm) showEnableArrivalAlarmResult(result, arrivalAlarm.leadMinutes)
                }}
              />
            ))}
          </Section>
        )}

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
