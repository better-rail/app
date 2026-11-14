import React from "react"
import { translate } from "@/i18n"
import { MenuPicker } from "./menu-picker"
import type { ColorSchemePickerProps } from "./color-scheme-picker.types"

export function ColorSchemePicker({ value, onChange }: ColorSchemePickerProps) {
  return (
    <MenuPicker
      testID="color-scheme-picker"
      label={translate("settings.colorScheme") ?? ""}
      value={value}
      onChange={onChange}
      options={[
        { value: "automatic", label: translate("settings.colorSchemeAutomatic") ?? "" },
        { value: "light", label: translate("settings.colorSchemeLight") ?? "" },
        { value: "dark", label: translate("settings.colorSchemeDark") ?? "" },
      ]}
    />
  )
}
