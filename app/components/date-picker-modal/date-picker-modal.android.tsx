import React, { useState } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import Modal from "react-native-modal"
import { DateType, useStores } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { color, spacing, isDarkMode } from "../../theme"
import DatePicker from "react-native-date-picker"
import MaterialTabs from "react-native-material-tabs"
import { Button } from "../button/button"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "20%",
  maxHeight: 400,
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
  const { isVisible, onConfirm, onCancel, onNow, minimumDate } = props
  const [selectedTab, setSelectedTab] = useState(0)

  const onDateTypeChange = (selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex)

    if (selectedTabIndex === 0) {
      routePlan.setDateType("departure")
    } else if (selectedTabIndex === 1) {
      routePlan.setDateType("arrival")
    } else {
      onNow()
    }
  }

  // Date will be kept locally until user confirmation
  const [modalDate, setModalDate] = useState(new Date())

  return (
    <Modal style={MODAL_WRAPPER} isVisible={isVisible} onBackButtonPress={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, width: "100%", padding: spacing[2] }}>
        <MaterialTabs
          items={[translate("plan.leaveAt"), translate("plan.arriveAt"), translate("plan.now")]}
          selectedIndex={selectedTab}
          onChange={onDateTypeChange}
          barColor={isDarkMode ? "#010101" : "#fff"}
          textStyle={{ color: color.text }}
          indicatorColor={isDarkMode ? "#0c83ff" : "#2196f3"}
        />
        <DatePicker
          date={modalDate}
          onDateChange={setModalDate}
          androidVariant="nativeAndroid"
          minuteInterval={15}
          locale={dateLocale}
          mode="datetime"
          minimumDate={minimumDate}
          fadeToColor="red"
          style={{ alignSelf: "center", marginVertical: spacing[5] }}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <Button
            title={translate("common.cancel")}
            onPress={onCancel}
            style={CANCEL_BUTTON}
            containerStyle={{ marginEnd: spacing[1] }}
            textStyle={{ color: isDarkMode ? color.dim : color.primary }}
            size="small"
          />
          <Button title={translate("common.set")} onPress={() => onConfirm(modalDate)} size="small" />
        </View>
      </View>
    </Modal>
  )
})
