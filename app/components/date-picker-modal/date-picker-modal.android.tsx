import { useState } from "react"
import { Pressable, TextStyle, View, type ViewStyle } from "react-native"
import { useRoutePlanStore } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { color, spacing, isDarkMode } from "../../theme"
import DatePicker from "react-native-date-picker"
import { Button } from "../button/button"
import type { ModalProps } from "react-native-modalfy"
import { Text } from "../text/text"

const MODAL_WRAPPER: ViewStyle = {
  minHeight: 285,
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: 8,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
  shadowOpacity: 0.45,
  elevation: 6,
}

const CANCEL_BUTTON: ViewStyle = {
  backgroundColor: isDarkMode ? "#1c1c1e" : "#fff",
  borderWidth: 1,
  borderColor: isDarkMode ? "#111111" : "#e5e5e9",
}

const TAB_STYLE: ViewStyle = {
  flex: 1,
  height: 40,
  backgroundColor: isDarkMode ? "#1c1c1e" : "#fff",
  borderBottomWidth: 2,
}

const ACTIVE_TAB_STYLE: ViewStyle = {
  ...TAB_STYLE,
  borderBottomColor: color.primary,
}

const INACTIVE_TAB_STYLE: ViewStyle = {
  ...TAB_STYLE,
  borderBottomColor: "transparent",
}

const TAB_TEXT_STYLEL: TextStyle = {
  fontFamily: "sans-serif-medium",
  fontSize: 14,
  fontWeight: "600",
  color: isDarkMode ? color.palette.white : color.palette.black,
  textAlign: "center",
  textTransform: "uppercase",
  lineHeight: 40,
}

export interface DatePickerModalProps {
  isVisible: boolean
  onChange: (date: Date) => void
  onConfirm: (date: Date) => void
  minimumDate?: Date
  style?: ViewStyle
}

export function DatePickerModal(props: ModalProps<"DatePickerModal">) {
  const setDateType = useRoutePlanStore((s) => s.setDateType)
  const { onConfirm, minimumDate } = props.modal.params
  const [selectedTab, setSelectedTab] = useState(0)

  const onDateTypeChange = (selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex)

    if (selectedTabIndex === 0) {
      setDateType("departure")
    } else {
      setDateType("arrival")
    }
  }

  // Date will be kept locally until user confirmation
  const [modalDate, setModalDate] = useState(new Date())

  return (
    <View style={MODAL_WRAPPER}>
      <View style={{ padding: spacing[2] }}>
        <View style={{ flexDirection: "row" }}>
          <Pressable
            style={selectedTab === 0 ? ACTIVE_TAB_STYLE : INACTIVE_TAB_STYLE}
            onPress={() => onDateTypeChange(0)}
            android_ripple={{ color: "rgba(0,0,0,0.1)" }}
          >
            <Text tx="plan.leaveAt" style={TAB_TEXT_STYLEL} />
          </Pressable>
          <Pressable
            style={selectedTab === 1 ? ACTIVE_TAB_STYLE : INACTIVE_TAB_STYLE}
            onPress={() => onDateTypeChange(1)}
            android_ripple={{ color: "rgba(0,0,0,0.1)" }}
          >
            <Text tx="plan.arriveAt" style={TAB_TEXT_STYLEL} />
          </Pressable>
        </View>
        <DatePicker
          date={modalDate}
          onDateChange={setModalDate}
          minuteInterval={15}
          locale={dateLocale}
          mode="datetime"
          minimumDate={minimumDate}
          style={{ alignSelf: "center", marginVertical: spacing[4] }}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-around", height: 40 }}>
          <Button
            title={translate("common.cancel")}
            onPress={() => {
              props.modal.closeModal()
            }}
            style={CANCEL_BUTTON}
            containerStyle={{ marginEnd: spacing[1] }}
            textStyle={{ color: isDarkMode ? color.dim : color.primary }}
            size="small"
          />
          <Button
            title={translate("common.set")}
            onPress={() => {
              onConfirm(modalDate)
              props.modal.closeModal()
            }}
            size="small"
          />
        </View>
      </View>
    </View>
  )
}
