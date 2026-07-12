import React, { useState, ReactNode } from "react"
import { View, Pressable, ViewStyle, TextStyle, ButtonProps, Platform, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { color, fontScale, spacing } from "@/theme"
import { Text } from "@/components/text/text"
import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass"

/**
 * Plain (non-Unistyles) base style for the pressable surface.
 *
 * Kept as a plain object because it's shared cross-file (e.g. the paywall subscribe button
 * layers it under a `LinearGradient`) and merged imperatively via `Object.assign` below.
 * Colors here are platform-adaptive (`color.primary`), so they still react to appearance natively.
 */
export const PRESSABLE_BASE: ViewStyle = {
  flex: 1,
  minHeight: 55,
  padding: spacing[4] * Math.min(fontScale, 1.2),
  backgroundColor: color.primary,
  borderRadius: Platform.select({ ios: 12, android: 6 }),
  opacity: 1,
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
  variant?: "primary" | "secondary" | "success"
  /**
   * An optional onPress handler that is only called when the button is disabled.
   */
  onDisabledPress?: () => void
}

export const Button = function Button(props: CustomButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const { title, onPress, loading = false, disabled, textStyle, containerStyle, size, icon, style, variant = "primary" } = props

  const PRESSABLE_STYLE = (() => {
    let modifiedStyles = Object.assign({}, PRESSABLE_BASE, style)
    if (size === "small") modifiedStyles = Object.assign({}, modifiedStyles, smallButtonStyle)
    if (Platform.OS === "ios") {
      if (isPressed && !disabled) {
        modifiedStyles = Object.assign(modifiedStyles, { opacity: props.pressedOpacity || 0.8 })
      }
    }
    return modifiedStyles
  })()

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} disabled={disabled} testID={props.testID}>
        <LiquidGlassView
          interactive={!!onPress}
          style={[styles.liquidGlass, style]}
          tintColor={disabled ? color.disabled : color[variant]}
        >
          <View style={styles.textWrapper}>
            {loading ? (
              <ActivityIndicator color={color.whiteText} />
            ) : (
              <>
                {icon}
                <Text style={[styles.text, textStyle, size === "small" && styles.smallText]} maxFontSizeMultiplier={1.3}>
                  {title}
                </Text>
              </>
            )}
          </View>
        </LiquidGlassView>
      </Pressable>
    )
  } else {
    return (
      <View style={[styles.buttonWrapper, containerStyle]}>
        <Pressable
          testID={props.testID}
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
            <View style={styles.textWrapper}>
              {icon}
              <Text style={[styles.text, textStyle, size === "small" && styles.smallText]} maxFontSizeMultiplier={1.3}>
                {title}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    )
  }
}

// `smallButtonStyle` is plain so it can merge with the plain `PRESSABLE_STYLE` above.
const smallButtonStyle: ViewStyle = {
  height: 40,
  padding: spacing[2] + 1.5,
}

const styles = StyleSheet.create((theme, rt) => ({
  buttonWrapper: {
    borderRadius: Platform.select({ ios: isLiquidGlassSupported ? 16 : 12, android: 6 }),
    borderCurve: "continuous",
    overflow: "hidden",
    elevation: 1,
    flex: 1,
  },
  textWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    fontFamily: theme.typography.primary,
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
    color: theme.colors.whiteText,
  },
  smallText: {
    fontSize: 14,
    fontWeight: "normal",
  },
  liquidGlass: {
    // Minimum height of 55, growing with the system font scale by no more than ~1.2x.
    height: Math.max(55, 55 * Math.min(rt.fontScale, 1.2)),
    padding: theme.spacing[4],
    borderRadius: 16,
    borderCurve: "continuous",
    justifyContent: "center",
  },
}))
