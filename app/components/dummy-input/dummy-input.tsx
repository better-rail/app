import * as React from "react"
import { TextStyle, Pressable, ViewStyle, PressableProps } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: "#fff",
  borderRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: 0.1,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
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
  placeholder: string

  /**
   * A dummy value
   */
  value?: string
}

/**
 * Looks like an input, yet simply a pressable that display the provided text.
 */
export const DummyInput = function DummyInput(props: DummyInputProps) {
  const { placeholder, value, style, ...rest } = props

  return (
    <Pressable style={[CONTAINER, style]} {...rest}>
      <Text style={TEXT}>{value || placeholder}</Text>
    </Pressable>
  )
}
