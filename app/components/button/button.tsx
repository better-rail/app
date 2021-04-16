import React, { useState, useMemo } from "react"
import { View, Pressable, TextStyle, ViewStyle, ButtonProps, Platform } from "react-native"
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
  elevation: 1,
  opacity: 1,
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
  const [isPressed, setIsPressed] = useState(false)
  const { title, onPress, disabled, style } = props

  const PRESSABLE_STYLE = useMemo(() => {
    let modifiedStyles = Object.assign({}, CONTAINER)
    if (Platform.OS === "ios") {
      if (isPressed) {
        modifiedStyles = Object.assign(modifiedStyles, { opacity: 0.8 })
      }
    }
    return modifiedStyles
  }, [isPressed, disabled])

  return (
    <View style={{ borderRadius: 12, overflow: "hidden" }}>
      <Pressable
        style={[PRESSABLE_STYLE, style, disabled && { backgroundColor: color.dim }]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        android_ripple={{ color: color.primaryLighter }}
        onPress={() => {
          disabled ? null : onPress()
        }}
      >
        <Text style={TEXT}>{title}</Text>
      </Pressable>
    </View>
  )
}
