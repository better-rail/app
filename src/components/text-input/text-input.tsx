import * as React from "react"
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"

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
    <View style={[styles.container, style]}>
      <RNTextInput style={styles.textInput} placeholder={placeholder} {...rest} />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 1,
  },
  textInput: {
    fontFamily: theme.typography.primary,
    fontWeight: "500",
    fontSize: 16,
    textAlign: "right",
    color: theme.colors.text,
  },
}))
