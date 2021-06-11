import React, { useMemo } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import Modal from "react-native-modal"
import { DateType, useStores } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { color, spacing } from "../../theme"
import HapticFeedback from "react-native-haptic-feedback"
import DatePicker from "react-native-date-picker"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "25%",
  maxHeight: 400,
  padding: spacing[5],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: 8,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
  shadowOpacity: 0.45,
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

  return (
    <Modal style={MODAL_WRAPPER} isVisible={isVisible}>
      <View>
        <DatePicker
          date={routePlan.date}
          onDateChange={onChange}
          androidVariant="nativeAndroid"
          minuteInterval={15}
          locale={"en_US"}
          mode="time"
          style={{ transform: [{ rotate: "-3600deg" }] }}
        />
      </View>
    </Modal>
  )
})
