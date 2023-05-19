import React, { useState, useMemo, ReactNode } from "react"
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
  opacity: 1,
}

const SMALL_BUTTON: ViewStyle = {
  height: 40,
  padding: spacing[2] + 1.5,
}

const TEXT_WRAPPER: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "700",
  fontSize: 16,
  textAlign: "center",
  color: color.whiteText,
}

const SMALL_TEXT: TextStyle = {
  fontSize: 14,
  fontWeight: "normal",
}

export interface CustomButtonProps extends ButtonProps {
  style?: ViewStyle
  containerStyle?: ViewStyle
  textStyle?: TextStyle
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  pressedOpacity?: number
  size?: "small"
  /**
   * An optional onPress handler that is only called when the button is disabled.
   */
  onDisabledPress?: () => void
}

export const Button = function Button(props: CustomButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const { title, onPress, loading = false, disabled, textStyle, containerStyle, size, icon, style } = props

  const PRESSABLE_STYLE = useMemo(() => {
    let modifiedStyles = Object.assign({}, PRESSABLE_BASE, style)
    if (size === "small") modifiedStyles = Object.assign({}, modifiedStyles, SMALL_BUTTON)
    if (Platform.OS === "ios") {
      if (isPressed && !disabled) {
        modifiedStyles = Object.assign(modifiedStyles, { opacity: props.pressedOpacity || 0.8 })
      }
    }
    return modifiedStyles
  }, [isPressed, disabled, style])

  return (
    <View style={[BUTTON_WRAPPER, containerStyle]}>
      <Pressable
        style={[PRESSABLE_STYLE, disabled && { backgroundColor: color.disabled }]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        android_ripple={{ color: color.primaryLighter }}
        onPress={(e) => {
          if (disabled) {
            if (props.onDisabledPress) props.onDisabledPress()
          } else {
            onPress(e)
          }
        }}
      >
        {loading ? (
          <ActivityIndicator color={color.whiteText} />
        ) : (
          <View style={TEXT_WRAPPER}>
            {icon}
            <Text style={[TEXT, textStyle, size === "small" && SMALL_TEXT]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}
