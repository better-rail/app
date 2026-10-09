import type { ColorSchemePreference } from "@/models/settings/settings"

export interface ColorSchemePickerProps {
  value: ColorSchemePreference
  onChange: (value: ColorSchemePreference) => void
}
