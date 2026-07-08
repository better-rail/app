import React from "react"
import { ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import SegmentedControl from "@expo/ui/community/segmented-control"
import { useShallow } from "zustand/react/shallow"
import type { DateType } from "@/models"
import { useRoutePlanStore } from "@/models"
import { dateLocale, translate } from "@/i18n"
import HapticFeedback from "react-native-haptic-feedback"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

export interface DatePickerModalProps {
  isVisible: boolean
  onChange: (date: Date) => void
  onConfirm: (date: Date) => void
  onCancel: () => void
  minimumDate?: Date
  style?: ViewStyle
}

export function DatePickerModal(props: DatePickerModalProps) {
  const { dateType, date, setDateType } = useRoutePlanStore(
    useShallow((s) => ({ dateType: s.dateType, date: s.date, setDateType: s.setDateType })),
  )
  const { isVisible, onChange, onConfirm, onCancel, minimumDate } = props

  return (
    <DateTimePickerModal
      isVisible={isVisible}
      mode="datetime"
      date={date}
      onChange={onChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
      locale={dateLocale}
      minimumDate={minimumDate}
      minuteInterval={15}
      customHeaderIOS={() => (
        <SegmentedControl
          values={[translate("plan.leaveAt"), translate("plan.arriveAt")]}
          selectedIndex={dateType === "departure" ? 0 : 1}
          onChange={(event) => {
            setDateType(DATE_TYPE[event.nativeEvent.selectedSegmentIndex])
            HapticFeedback.trigger("impactLight")
          }}
          style={styles.segmentedControl}
        />
      )}
      customCancelButtonIOS={() => null}
      confirmTextIOS={translate("common.ok")}
    />
  )
}

const styles = StyleSheet.create((theme) => ({
  segmentedControl: {
    marginHorizontal: theme.spacing[3],
    marginTop: theme.spacing[3],
    marginBottom: -6,
  },
}))
