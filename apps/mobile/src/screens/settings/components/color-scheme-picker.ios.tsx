import React from "react"
import { View } from "react-native"
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui"
import { accessibilityLabel, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { ColorSchemePickerProps } from "./color-scheme-picker.types"

export function ColorSchemePicker({ value, onChange }: ColorSchemePickerProps) {
  const label = translate("settings.colorScheme") ?? ""
  const { theme } = useUnistyles()
  // Themed accents are hex strings; the system blue needs no tint
  const accent = typeof theme.colors.primary === "string" ? theme.colors.primary : undefined

  return (
    <View style={styles.row} testID="color-scheme-picker">
      <Text style={styles.label}>{label}</Text>
      <Host matchContents>
        <Picker
          label=""
          selection={value}
          onSelectionChange={onChange}
          modifiers={[pickerStyle("menu"), accessibilityLabel(label), ...(accent ? [tint(accent)] : [])]}
        >
          <SwiftUIText modifiers={[tag("automatic")]}>{translate("settings.colorSchemeAutomatic")}</SwiftUIText>
          <SwiftUIText modifiers={[tag("light")]}>{translate("settings.colorSchemeLight")}</SwiftUIText>
          <SwiftUIText modifiers={[tag("dark")]}>{translate("settings.colorSchemeDark")}</SwiftUIText>
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
