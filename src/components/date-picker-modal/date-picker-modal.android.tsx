import { useEffect, useState } from "react"
import { Modal, Pressable, View, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore } from "@/models"
import { dateLocale, translate } from "@/i18n"
import { color, isDarkMode } from "@/theme"
import DatePicker from "react-native-date-picker"
import { Button } from "@/components/button/button"
import { Text } from "@/components/text/text"

export interface DatePickerModalProps {
  isVisible: boolean
  onChange?: (date: Date) => void
  onConfirm: (date: Date) => void
  onCancel: () => void
  minimumDate?: Date
  style?: ViewStyle
}

export function DatePickerModal({ isVisible, onConfirm, onCancel, minimumDate }: DatePickerModalProps) {
  const { setDateType, dateType } = useRoutePlanStore(useShallow((s) => ({ setDateType: s.setDateType, dateType: s.dateType })))
  const [selectedTab, setSelectedTab] = useState(dateType === "arrival" ? 1 : 0)
  const [modalDate, setModalDate] = useState(new Date())

  useEffect(() => {
    if (isVisible) {
      setSelectedTab(dateType === "arrival" ? 1 : 0)
      setModalDate(new Date())
    }
  }, [isVisible])

  const onDateTypeChange = (selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex)
    setDateType(selectedTabIndex === 0 ? "departure" : "arrival")
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <View style={styles.content}>
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, selectedTab === 0 ? styles.activeTab : styles.inactiveTab]}
                onPress={() => onDateTypeChange(0)}
                android_ripple={{ color: "rgba(0,0,0,0.1)" }}
              >
                <Text tx="plan.leaveAt" style={styles.tabText} />
              </Pressable>
              <Pressable
                style={[styles.tab, selectedTab === 1 ? styles.activeTab : styles.inactiveTab]}
                onPress={() => onDateTypeChange(1)}
                android_ripple={{ color: "rgba(0,0,0,0.1)" }}
              >
                <Text tx="plan.arriveAt" style={styles.tabText} />
              </Pressable>
            </View>
            <DatePicker
              date={modalDate}
              onDateChange={setModalDate}
              minuteInterval={15}
              locale={dateLocale}
              mode="datetime"
              minimumDate={minimumDate}
              style={styles.datePicker}
            />

            <View style={styles.actionsRow}>
              <Button
                title={translate("common.cancel")}
                onPress={onCancel}
                style={styles.cancelButton}
                containerStyle={styles.cancelButtonContainer}
                textStyle={{ color: isDarkMode ? color.dim : color.primary }}
                size="small"
              />
              <Button
                title={translate("common.set")}
                onPress={() => onConfirm(modalDate)}
                size="small"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWrapper: {
    minHeight: 285,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 2,
    shadowOpacity: 0.45,
    elevation: 6,
  },
  content: {
    padding: theme.spacing[2],
  },
  tabRow: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    height: 40,
    backgroundColor: rt.colorScheme === "dark" ? "#1c1c1e" : "#fff",
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  inactiveTab: {
    borderBottomColor: "transparent",
  },
  tabText: {
    fontFamily: "sans-serif-medium",
    fontSize: 14,
    fontWeight: "600",
    color: rt.colorScheme === "dark" ? theme.colors.palette.white : theme.colors.palette.black,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 40,
  },
  datePicker: {
    alignSelf: "center",
    marginVertical: theme.spacing[4],
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    height: 40,
  },
  cancelButton: {
    backgroundColor: rt.colorScheme === "dark" ? "#1c1c1e" : "#fff",
    borderWidth: 1,
    borderColor: rt.colorScheme === "dark" ? "#111111" : "#e5e5e9",
  },
  cancelButtonContainer: {
    marginEnd: theme.spacing[1],
  },
}))
