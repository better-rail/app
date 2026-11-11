import React from "react"
import { View } from "react-native"
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui"
import { accessibilityLabel, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import type { MenuPickerProps } from "./menu-picker.types"

export function MenuPicker<T extends string>({ label, value, options, onChange, testID }: MenuPickerProps<T>) {
  const { theme } = useUnistyles()
  // Themed accents are hex strings; the system blue needs no tint
  const accent = typeof theme.colors.primary === "string" ? theme.colors.primary : undefined

  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Host matchContents>
        <Picker
          label=""
          selection={value}
          onSelectionChange={(selection) => onChange(selection as T)}
          modifiers={[pickerStyle("menu"), accessibilityLabel(label), ...(accent ? [tint(accent)] : [])]}
        >
          {options.map((option) => (
            <SwiftUIText key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </SwiftUIText>
          ))}
        </Picker>
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
