import React from "react"
import { View } from "react-native"
import { SettingBox } from "./settings-box"
import type { MenuPickerProps } from "./menu-picker.types"

/** Without native menus (web, tests): the options as a checkmark list. */
export function MenuPicker<T extends string>({ value, options, onChange, testID }: MenuPickerProps<T>) {
  return (
    <View testID={testID}>
      {options.map((option, index) => (
        <SettingBox
          key={option.value}
          first={index === 0}
          last={index === options.length - 1}
          title={option.label}
          checkmark={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  )
}
