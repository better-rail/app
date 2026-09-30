import React, { useState } from "react"
import { Pressable, View } from "react-native"
import { DropdownMenu, DropdownMenuItem, Host, RNHostView, Text as ComposeText } from "@expo/ui/jetpack-compose"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { FillWidth } from "@/components/context-menu/fill-width"
import { translate } from "@/i18n"
import type { ColorSchemePreference } from "@/models/settings/settings"
import type { ColorSchemePickerProps } from "./color-scheme-picker.types"

export function ColorSchemePicker({ value, onChange }: ColorSchemePickerProps) {
  const [expanded, setExpanded] = useState(false)
  const label = translate("settings.colorScheme") ?? ""
  const options: { value: ColorSchemePreference; label: string }[] = [
    { value: "automatic", label: translate("settings.colorSchemeAutomatic") ?? "" },
    { value: "light", label: translate("settings.colorSchemeLight") ?? "" },
    { value: "dark", label: translate("settings.colorSchemeDark") ?? "" },
  ]
  const selectedLabel = options.find((option) => option.value === value)?.label ?? ""

  return (
    <FillWidth>
      {(width) => (
        <Host matchContents>
          <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
            <DropdownMenu.Trigger>
              <RNHostView matchContents>
                <Pressable
                  testID="color-scheme-picker"
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${selectedLabel}`}
                  onPress={() => setExpanded(true)}
                  style={[styles.row, { width }]}
                >
                  <Text style={styles.label}>{label}</Text>
                  <View style={styles.selection}>
                    <Text style={styles.selectedValue}>{selectedLabel}</Text>
                    <Text style={styles.chevron}>▾</Text>
                  </View>
                </Pressable>
              </RNHostView>
            </DropdownMenu.Trigger>
            <DropdownMenu.Items>
              {options.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setExpanded(false)
                  }}
                >
                  <DropdownMenuItem.Text>
                    <ComposeText>{option.label}</ComposeText>
                  </DropdownMenuItem.Text>
                  {option.value === value && (
                    <DropdownMenuItem.TrailingIcon>
                      <ComposeText>✓</ComposeText>
                    </DropdownMenuItem.TrailingIcon>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenu.Items>
          </DropdownMenu>
        </Host>
      )}
    </FillWidth>
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
