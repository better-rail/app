import React, { useMemo } from "react"
import { ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import SegmentedControl from "@react-native-segmented-control/segmented-control"
import { DateType, useStores } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { spacing } from "../../theme"
import HapticFeedback from "react-native-haptic-feedback"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

const SEGMENTED_CONTROL: ViewStyle = {
  marginHorizontal: spacing[3],
  marginTop: spacing[3],
  marginBottom: -6,
}

export interface DatePickerModalProps {
  isVisible: boolean
  onChange: (date: Date) => void
  onConfirm: (date: Date) => void
  onCancel: () => void
  minimumDate?: Date
  style?: ViewStyle
}

export const DatePickerModal = observer(function DatePickerModal(props: DatePickerModalProps) {
  const { routePlan } = useStores()
  const { isVisible, onChange, onConfirm, onCancel, minimumDate } = props

  const dateTypeControl = useMemo(
    () => (
      <SegmentedControl
        values={[translate("plan.leaveAt"), translate("plan.arriveAt")]}
        selectedIndex={routePlan.dateType === "departure" ? 0 : 1}
        onChange={(event) => {
          routePlan.setDateType(DATE_TYPE[event.nativeEvent.selectedSegmentIndex])
          HapticFeedback.trigger("impactLight")
        }}
        style={SEGMENTED_CONTROL}
      />
    ),
    [routePlan.dateType],
  )

  return (
    <DateTimePickerModal
      isVisible={isVisible}
      mode="datetime"
      date={routePlan.date}
      onChange={(_, date) => onChange(date)}
      onConfirm={onConfirm}
      onCancel={onCancel}
      locale={dateLocale}
      minimumDate={minimumDate}
      minuteInterval={15}
      customHeaderIOS={() => dateTypeControl}
      customCancelButtonIOS={() => null}
      confirmTextIOS={translate("common.ok")}
    />
  )
})
