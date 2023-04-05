import React, { useMemo, useState } from "react"
import { TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import SegmentedControl from "@react-native-segmented-control/segmented-control"
import { DateType, useStores } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { spacing, typography, color } from "../../theme"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "../text/text"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

const DATEPICKER_HEADER: ViewStyle = {
  marginHorizontal: spacing[3],
  marginTop: spacing[3],
  marginBottom: -6,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const NOW_BUTTON_TEXT: TextStyle = {
  fontFamily: typography.secondary,
  color: color.primary,
}

export interface DatePickerModalProps {
  isVisible: boolean
  onNow: () => void
  onChange: (date: Date) => void
  onConfirm: (date: Date) => void
  onCancel: () => void
  minimumDate?: Date
  style?: ViewStyle
}

export const DatePickerModal = observer(function DatePickerModal(props: DatePickerModalProps) {
  const { routePlan } = useStores()
  const { isVisible, onChange, onConfirm, onCancel, onNow, minimumDate } = props

  const [headerWidth, setHeaderWidth] = useState(0)
  const [nowButtonWidth, setNowButtonWidth] = useState(0)

  const datePickerHeader = useMemo(
    () => (
      <View style={DATEPICKER_HEADER} onLayout={(e) => setHeaderWidth(e.nativeEvent.layout.width)}>
        <SegmentedControl
          style={{ width: headerWidth - nowButtonWidth - spacing[2] }}
          values={[translate("plan.leaveAt"), translate("plan.arriveAt")]}
          selectedIndex={routePlan.dateType === "departure" ? 0 : 1}
          onChange={(event) => {
            routePlan.setDateType(DATE_TYPE[event.nativeEvent.selectedSegmentIndex])
            HapticFeedback.trigger("impactLight")
          }}
        />
        <TouchableOpacity onPress={onNow} onLayout={(e) => setNowButtonWidth(e.nativeEvent.layout.width)}>
          <Text style={NOW_BUTTON_TEXT}>{translate("plan.now")}</Text>
        </TouchableOpacity>
      </View>
    ),
    [routePlan.dateType, headerWidth, nowButtonWidth],
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
      customHeaderIOS={() => datePickerHeader}
      customCancelButtonIOS={() => null}
      confirmTextIOS={translate("common.ok")}
    />
  )
})
