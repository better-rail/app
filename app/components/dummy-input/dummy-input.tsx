import * as React from "react"
import { TextStyle, Pressable, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: "#fff",
  borderRadius: 12,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 16,
  color: color.dim,
}

export interface DummyInputProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Looks like an input, yet simply a pressable that display the provided text.
 */
export const DummyInput = observer(function DummyInput(props: DummyInputProps) {
  const { style, ...rest } = props

  return (
    <Pressable style={[CONTAINER, style]} {...rest}>
      <Text style={TEXT}>תחנת מוצא</Text>
    </Pressable>
  )
})
