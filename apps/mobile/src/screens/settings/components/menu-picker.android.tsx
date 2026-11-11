import React, { useState } from "react"
import { Pressable, View } from "react-native"
import { DropdownMenu, DropdownMenuItem, Host, RNHostView, Text as ComposeText } from "@expo/ui/jetpack-compose"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { FillWidth } from "@/components/context-menu/fill-width"
import type { MenuPickerProps } from "./menu-picker.types"

export function MenuPicker<T extends string>({ label, value, options, onChange, testID }: MenuPickerProps<T>) {
  const [expanded, setExpanded] = useState(false)
  const selectedLabel = options.find((option) => option.value === value)?.label ?? ""

  return (
    <FillWidth>
      {(width) => (
        // @expo/ui 58 mirrors Compose in RTL, which anchors the menu away from the value; keep 57's LTR.
        <Host matchContents layoutDirection="leftToRight">
          <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
            <DropdownMenu.Trigger>
              <RNHostView matchContents>
                <Pressable
                  testID={testID}
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
