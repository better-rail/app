import { Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { ContextMenu, type ContextMenuAction } from "@/components/context-menu/context-menu"
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

/** Rings before the rider's stops. A Material dropdown on a button the size of the stop button. */
export function ArrivalAlarmButton({ now }: { now: number }) {
  const arrivalAlarm = useRideStore((s) => s.arrivalAlarm)
  const stopOptions = useArrivalAlarmStopOptions(now)

  const actions: ContextMenuAction[] = ARRIVAL_ALARM_LEAD_MINUTES.map((minutes) => ({
    title: translate("ride.alarmLeadOption", { minutes }) ?? "",
    selected: arrivalAlarm?.leadMinutes === minutes,
    onPress: async () => showEnableArrivalAlarmResult(await enableArrivalAlarm(minutes), minutes),
  }))

  for (const option of stopOptions) {
    actions.push({
      title: option.title,
      selected: option.checked,
      disabled: option.disabled,
      onPress: async () => {
        const result = await toggleArrivalAlarmStopChoice(option.train)
        if (result && arrivalAlarm) showEnableArrivalAlarmResult(result, arrivalAlarm.leadMinutes)
      },
    })
  }

  if (arrivalAlarm) {
    actions.push({ title: translate("ride.alarmTurnOff") ?? "", destructive: true, onPress: disableArrivalAlarm })
  }

  return (
    <ContextMenu mode="tap" actions={actions}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={translate("ride.alarmButton") ?? ""}
        accessibilityValue={
          arrivalAlarm ? { text: formatTime(getNextArrivalAlarmStop(arrivalAlarm.stops, now).fireDate) } : undefined
        }
        testID="arrival-alarm-button"
        style={[styles.button, arrivalAlarm && styles.buttonActive]}
      >
        <Image source={require("../../../../assets/alarm.png")} style={[styles.icon, arrivalAlarm && styles.iconActive]} />
      </View>
    </ContextMenu>
  )
}

const styles = StyleSheet.create((theme) => ({
  button: {
    width: 42.5,
    height: 42.5,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.dimmer,
  },
  buttonActive: {
    backgroundColor: "#FBA928",
  },
  icon: {
    width: 22,
    height: 22,
    tintColor: theme.colors.text,
  },
  iconActive: {
    tintColor: "#000000",
  },
}))
