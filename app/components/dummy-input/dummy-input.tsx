import * as React from "react"
import { Platform, TextStyle, TouchableOpacity, ViewStyle, PressableProps } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: color.inputBackground,
  borderRadius: Platform.select({ ios: isLiquidGlassSupported ? 16 : 12, android: 6 }),
  borderCurve: "continuous",
  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 0,
  elevation: 1,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "500",
  fontSize: 16,
  textAlign: "left",
  color: color.dim,
}

export interface DummyInputProps extends PressableProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle

  /**
   * Text to display when no value is provided
   */
  placeholder?: string

  /**
   * An optional inline label to display
   * This will change the component display to include both label & value
   */
  label?: string

  /**
   * The value to display
   */
  value?: string

  /**
   * Pass a component to present at the other side of the dummy input
   */
  endSection?: React.ReactNode
}

/**
 * Looks like an input, yet simply a pressable that display the provided text.
 */
export const DummyInput = function DummyInput(props: DummyInputProps) {
  const { placeholder, label, value, style, endSection, ...rest } = props

  if (label) {
    return (
      <TouchableOpacity
        style={[CONTAINER, style, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
        activeOpacity={0.75}
        {...rest}
      >
        <Text style={[TEXT, value && { color: color.text }]}>{label}</Text>
        <Text style={value && { color: color.text }}>{value || placeholder}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      style={[CONTAINER, style, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
      activeOpacity={0.75}
      {...rest}
    >
      <Text style={[TEXT, value && { color: color.text }]}>{value || placeholder}</Text>
      {endSection}
    </TouchableOpacity>
  )
}
