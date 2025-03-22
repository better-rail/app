import React, { useEffect, useState } from "react"
import { View, type ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { type DateType, useStores } from "../../models"
import { dateLocale, translate } from "../../i18n"
import { color, spacing, isDarkMode, fontScale } from "../../theme"
import DatePicker from "react-native-date-picker"
import MaterialTabs from "react-native-material-tabs"
import { Button } from "../button/button"
import type { ModalProps } from "react-native-modalfy"

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

export interface DatePickerModalProps {
  isVisible: boolean
  onChange: (date: Date) => void
  onConfirm: (date: Date) => void
  minimumDate?: Date
  style?: ViewStyle
}

export const DatePickerModal = observer(function DatePickerModal(props: ModalProps<"DatePickerModal">) {
  const { routePlan } = useStores()
  const { onConfirm, minimumDate } = props.modal.params
  const [selectedTab, setSelectedTab] = useState(0)

  const onDateTypeChange = (selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex)

    if (selectedTabIndex === 0) {
      routePlan.setDateType("departure")
    } else {
      routePlan.setDateType("arrival")
    }
  }

  // Date will be kept locally until user confirmation
  const [modalDate, setModalDate] = useState(new Date())

  return (
    <View style={MODAL_WRAPPER}>
      <View style={{ padding: spacing[2] }}>
        <MaterialTabs
          items={[translate("plan.leaveAt"), translate("plan.arriveAt")]}
          selectedIndex={selectedTab}
          onChange={onDateTypeChange}
          barColor={isDarkMode ? "#010101" : "#fff"}
          textStyle={{ color: color.text }}
          indicatorColor={isDarkMode ? "#0c83ff" : "#2196f3"}
        />
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
})
