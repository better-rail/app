import React, { useEffect, useMemo, useState } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import Modal from "react-native-modal"
import { DateType, useStores } from "../../models"
import { dateLocale, translate, useFormattedDate } from "../../i18n"
import { color, spacing } from "../../theme"
import DatePicker from "react-native-date-picker"
import DateTimePicker from "@react-native-community/datetimepicker"
import MaterialTabs from "react-native-material-tabs"
import { Text } from "../text/text"
import { format } from "date-fns"
import { Button } from "../button/button"

// A dictionary to set the date type according to the segmented control selected index
const DATE_TYPE: { [key: number]: DateType } = { 0: "departure", 1: "arrival" }

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "20%",
  maxHeight: 400,
  padding: spacing[1],
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
  const { isVisible, onConfirm, onCancel, minimumDate } = props
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
    <Modal style={MODAL_WRAPPER} isVisible={isVisible} onBackButtonPress={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, width: 280 }}>
        <MaterialTabs
          items={[translate("plan.leaveAt"), translate("plan.arriveAt")]}
          selectedIndex={selectedTab}
          onChange={onDateTypeChange}
          barColor="white"
          textStyle={{ color: color.text }}
          indicatorColor="#2196f3"
        />
        <DatePicker
          date={modalDate}
          onDateChange={setModalDate}
          androidVariant="nativeAndroid"
          minuteInterval={15}
          locale={dateLocale}
          mode="datetime"
          minimumDate={minimumDate}
          style={{ alignSelf: "center", marginVertical: spacing[2] }}
        />

        <View style={{ flexDirection: "row" }}>
          <Button
            title={translate("common.cancel")}
            onPress={onCancel}
            style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#e9e9e9" }}
            containerStyle={{ marginEnd: spacing[1] }}
            textStyle={{ color: color.primary }}
          />
          <Button title={translate("common.set")} onPress={() => onConfirm(modalDate)} />
        </View>
      </View>
    </Modal>
  )
})
