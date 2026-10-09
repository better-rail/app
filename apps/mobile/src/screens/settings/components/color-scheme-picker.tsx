import React from "react"
import { View } from "react-native"
import { SettingBox } from "./settings-box"
import { translate } from "@/i18n"
import type { ColorSchemePickerProps } from "./color-scheme-picker.types"

export function ColorSchemePicker({ value, onChange }: ColorSchemePickerProps) {
  return (
    <View>
      <SettingBox
        first
        title={translate("settings.colorSchemeAutomatic") ?? ""}
        checkmark={value === "automatic"}
        onPress={() => onChange("automatic")}
      />
      <SettingBox
        title={translate("settings.colorSchemeLight") ?? ""}
        checkmark={value === "light"}
        onPress={() => onChange("light")}
      />
      <SettingBox
        last
        title={translate("settings.colorSchemeDark") ?? ""}
        checkmark={value === "dark"}
        onPress={() => onChange("dark")}
      />
    </View>
  )
}
