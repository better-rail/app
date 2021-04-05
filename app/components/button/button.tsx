import * as React from "react"
import { TouchableOpacity, TextStyle, View, ViewStyle, ButtonProps } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: color.primary,
  borderRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: 0.1,
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
}

/**
 * Describe your component here
 */
export const Button = function Button(props: CustomButtonProps) {
  const { title, style } = props

  return (
    <TouchableOpacity style={[CONTAINER, style]} activeOpacity={0.8}>
      <Text style={TEXT}>{title}</Text>
    </TouchableOpacity>
  )
}
