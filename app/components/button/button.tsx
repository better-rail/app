import React, { useState, useMemo } from "react"
import { View, Pressable, TextStyle, ViewStyle, ButtonProps, Platform, ActivityIndicator } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const BUTTON_WRAPPER: ViewStyle = {
  borderRadius: Platform.select({ ios: 12, android: 6 }),
  overflow: "hidden",
  elevation: 1,
  flex: 1,
}

const PRESSABLE_BASE: ViewStyle = {
  flex: 1,
  minHeight: 55,
  padding: spacing[4],
  backgroundColor: color.primary,
  borderRadius: Platform.select({ ios: 12, android: 6 }),
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
  containerStyle?: ViewStyle
  textStyle?: TextStyle
  loading?: boolean
  disabled?: boolean
}

/**
 * Describe your component here
 */
export const Button = function Button(props: CustomButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const { title, onPress, loading = false, disabled, textStyle, containerStyle, style } = props

  const PRESSABLE_STYLE = useMemo(() => {
    let modifiedStyles = Object.assign({}, PRESSABLE_BASE, style)
    if (Platform.OS === "ios") {
      if (isPressed) {
        modifiedStyles = Object.assign(modifiedStyles, { opacity: 0.8 })
      }
    }
    return modifiedStyles
  }, [isPressed, disabled])

  return (
    <View style={[BUTTON_WRAPPER, containerStyle]}>
      <Pressable
        style={[PRESSABLE_STYLE, disabled && { backgroundColor: color.disabled }]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        android_ripple={{ color: color.primaryLighter }}
        onPress={() => {
          disabled ? null : onPress()
        }}
      >
        {loading ? <ActivityIndicator color={color.whiteText} /> : <Text style={[TEXT, textStyle]}>{title}</Text>}
      </Pressable>
    </View>
  )
}
