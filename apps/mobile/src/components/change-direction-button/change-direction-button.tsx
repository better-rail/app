import * as React from "react"
import { Image, ViewStyle, TouchableOpacity, TouchableOpacityProps, Platform, Pressable } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { translate } from "@/i18n"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported, useGlassTint } from "@/utils/liquid-glass"

const upDownArrowIcon = require("../../../assets/up-down-arrow.png")

export interface ChangeDirectionButtonProps extends TouchableOpacityProps {
  /**
   * An optional style override useful for padding & margin.
   */
  buttonStyle?: ViewStyle
}

/**
 * Describe your component here
 */
export function ChangeDirectionButton(props: ChangeDirectionButtonProps) {
  const { onPress, buttonStyle } = props
  const glassTint = useGlassTint("secondary")

  if (isLiquidGlassSupported) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate("plan.switchStations")}
        accessibilityHint={translate("plan.switchStationsHint")}
        {...props}
        style={buttonStyle}
      >
        <GlassView isInteractive style={styles.glassContainer} tintColor={glassTint}>
          <Image source={upDownArrowIcon} style={styles.arrowIcon} />
        </GlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.container, buttonStyle]}
      activeOpacity={onPress ? 0.9 : 1}
      accessibilityRole="button"
      accessibilityLabel={translate("plan.switchStations")}
      accessibilityHint={translate("plan.switchStationsHint")}
      {...props}
    >
      <Image source={upDownArrowIcon} style={styles.arrowIcon} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme, rt) => {
  let buttonSize = 62.5
  let iconSize = 32.5

  if (rt.screen.height > 730) {
    buttonSize = 70
    iconSize = 35
  }

  if (rt.screen.height > 900) {
    buttonSize = 75
    iconSize = 37
  }

  const shape = {
    width: buttonSize,
    height: buttonSize,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
  } as const

  return {
    glassContainer: shape,
    container: {
      ...shape,
      backgroundColor: theme.colors.secondary,
      shadowOffset: { width: 0, height: 0.5 },
      shadowColor: theme.colors.palette.black,
      shadowRadius: 0.4,
      shadowOpacity: 0.5,
      elevation: 2,
    },
    arrowIcon: {
      width: Platform.select({ ios: iconSize, android: iconSize + 2.5 }),
      height: Platform.select({ ios: iconSize, android: iconSize + 2.5 }),
      tintColor: "#fff",
    },
  }
})
