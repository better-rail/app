import * as React from "react"
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View, TextStyle, ViewStyle } from "react-native"
import { color, spacing, typography } from "../../theme"

const CONTAINER: ViewStyle = {
  padding: spacing[4],
  backgroundColor: color.inputBackground,
  borderRadius: 12,
  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 0,
  elevation: 1,
}

const TEXT_INPUT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "500",
  fontSize: 16,
  textAlign: "right",
  color: color.text,
}

export interface TextInputProps extends RNTextInputProps {
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
export const TextInput = function DummyInput(props: TextInputProps) {
  const { placeholder, value, style, ...rest } = props

  return (
    <View style={[CONTAINER, style]}>
      <RNTextInput style={TEXT_INPUT} placeholder={placeholder} {...rest} />
    </View>
  )
}
