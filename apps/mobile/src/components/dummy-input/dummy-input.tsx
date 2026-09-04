import * as React from "react"
import { Platform, TouchableOpacity, ViewStyle, PressableProps } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { color } from "@/theme"
import { Text } from "@/components/text/text"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

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
        style={[styles.container, style, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
        activeOpacity={0.75}
        {...rest}
      >
        <Text style={[styles.text, value && { color: color.text }]}>{label}</Text>
        <Text style={value && { color: color.text }}>{value || placeholder}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.container, style, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
      activeOpacity={0.75}
      {...rest}
    >
      <Text style={[styles.text, value && { color: color.text }]}>{value || placeholder}</Text>
      {endSection}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.inputBackground,
    borderRadius: Platform.select({ ios: isLiquidGlassSupported ? 16 : 12, android: 6 }),
    borderCurve: "continuous",
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 1,
  },
  text: {
    fontFamily: theme.typography.primary,
    fontWeight: "500",
    fontSize: 16,
    textAlign: "left",
    color: theme.colors.dim,
  },
}))
