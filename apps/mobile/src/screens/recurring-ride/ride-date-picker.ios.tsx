import { View } from "react-native"
import { format } from "date-fns"
import { DatePicker, Host } from "@expo/ui/swift-ui"
import { accessibilityLabel, datePickerStyle, environment, labelsHidden, tint } from "@expo/ui/swift-ui/modifiers"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import { userLocale } from "@/i18n"
import { toPickerDate, type RideDatePickerProps } from "./ride-date-picker.types"

/** The compact system date picker: the date as a button that opens a calendar */
export function RideDatePicker({ label, value, minimumDate, maximumDate, onChange, testID }: RideDatePickerProps) {
  const { theme } = useUnistyles()
  // Themed accents are hex strings; the system blue needs no tint
  const accent = typeof theme.colors.primary === "string" ? theme.colors.primary : undefined

  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Host matchContents>
        <DatePicker
          selection={toPickerDate(value)}
          range={{ start: toPickerDate(minimumDate), end: toPickerDate(maximumDate) }}
          displayedComponents={["date"]}
          onDateChange={(date) => onChange(format(date, "yyyy-MM-dd"))}
          modifiers={[
            datePickerStyle("compact"),
            labelsHidden(),
            // In the app's language, which can differ from the system's
            environment("locale", `${userLocale}_IL`),
            accessibilityLabel(label),
            ...(accent ? [tint(accent)] : []),
          ]}
        />
      </Host>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: 52,
    paddingStart: 20,
    paddingEnd: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16.5,
    flexShrink: 1,
    marginEnd: theme.spacing[2],
  },
}))
