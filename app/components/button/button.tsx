import * as React from "react"
import { Pressable, TextStyle, ViewStyle, ButtonProps, Platform } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"
import { TouchableNativeFeedback, TouchableOpacity } from "react-native-gesture-handler"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: color.primary,
  borderRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: 0.1,
  elevation: 1,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "700",
  fontSize: 16,
  textAlign: "center",
  color: color.background,
}
export interface CustomButtonProps extends ButtonProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle

  disabled?: boolean
}

/**
 * Describe your component here
 */
export const Button = function Button(props: CustomButtonProps) {
  const { title, onPress, disabled, style } = props

  return (
    <TouchableOpacity
      style={[CONTAINER, style, disabled && { backgroundColor: color.dim }]}
      activeOpacity={0.8}
      onPress={() => {
        disabled ? null : onPress()
      }}
    >
      <Text style={TEXT}>{title}</Text>
    </TouchableOpacity>
  )
}
