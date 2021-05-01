import React, { useState, useMemo } from "react"
import { View, Pressable, TextStyle, ViewStyle, ButtonProps, Platform, ActivityIndicator } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const BUTTON_WRAPPER: ViewStyle = {
  borderRadius: 12,
  overflow: "hidden",
  elevation: 1,
}

const PRESSABLE_BASE: ViewStyle = {
  minHeight: 55,
  padding: spacing[4],
  backgroundColor: color.primary,
  borderRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: 0.1,
  opacity: 1,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "700",
  fontSize: 16,
  textAlign: "center",
  color: color.whiteText,
}
export interface CustomButtonProps extends ButtonProps {
  style?: ViewStyle
  loading?: boolean
  disabled?: boolean
}

/**
 * Describe your component here
 */
export const Button = function Button(props: CustomButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const { title, onPress, loading = false, disabled, style } = props

  const PRESSABLE_STYLE = useMemo(() => {
    let modifiedStyles = Object.assign({}, PRESSABLE_BASE)
    if (Platform.OS === "ios") {
      if (isPressed) {
        modifiedStyles = Object.assign(modifiedStyles, { opacity: 0.8 })
      }
    }
    return modifiedStyles
  }, [isPressed, disabled])

  return (
    <View style={BUTTON_WRAPPER}>
      <Pressable
        style={[PRESSABLE_STYLE, style, disabled && { backgroundColor: color.disabled }]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        android_ripple={{ color: color.primaryLighter }}
        onPress={() => {
          disabled ? null : onPress()
        }}
      >
        {loading ? <ActivityIndicator color={color.whiteText} /> : <Text style={TEXT}>{title}</Text>}
      </Pressable>
    </View>
  )
}
