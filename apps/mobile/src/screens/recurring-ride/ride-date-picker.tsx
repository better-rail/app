import { useState } from "react"
import { Pressable, View } from "react-native"
import { format } from "date-fns"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { dateLocale } from "@/i18n"
import { rideDateShort } from "./recurring-ride-format"
import { toPickerDate, type RideDatePickerProps } from "./ride-date-picker.types"

/** The date as a row; tapping it opens the system date picker dialog */
export function RideDatePicker({ label, value, minimumDate, maximumDate, onChange, testID }: RideDatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${rideDateShort(value)}`}
        onPress={() => setOpen(true)}
        style={styles.row}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.selection}>
          <Text style={styles.selectedValue}>{rideDateShort(value)}</Text>
          <Text style={styles.chevron}>▾</Text>
        </View>
      </Pressable>
      <DateTimePickerModal
        isVisible={open}
        mode="date"
        date={toPickerDate(value)}
        minimumDate={toPickerDate(minimumDate)}
        maximumDate={toPickerDate(maximumDate)}
        locale={dateLocale}
        onConfirm={(date) => {
          setOpen(false)
          onChange(format(date, "yyyy-MM-dd"))
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16.5,
    flexShrink: 1,
    marginEnd: theme.spacing[2],
  },
  selection: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  selectedValue: {
    color: theme.colors.primary,
  },
  chevron: {
    color: theme.colors.dim,
    fontSize: 16,
  },
}))
