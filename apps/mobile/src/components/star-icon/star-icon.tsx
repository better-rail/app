import React from "react"
import { Image, Pressable, type ViewStyle } from "react-native"
import { AccessibilityState } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { translate } from "@/i18n"
import { TouchableOpacity } from "react-native-gesture-handler"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const starImage = require("../../../assets/star.png")

export interface StarIconProps {
  style?: ViewStyle
  onPress: () => void

  /**
   * Whether the star is outlined or filled
   */
  filled: boolean
}

export function StarIcon(props: StarIconProps) {
  const { onPress, filled, style } = props

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} style={[styles.container, style]}>
        <LiquidGlassView interactive colorScheme="dark" tintColor="rgba(51, 51, 51, 0.9)" style={styles.liquidGlass}>
          <Image source={starImage} style={[styles.starIcon, styles.starState(filled)]} accessible={false} />
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={translate("favorites.title")}
      accessibilityState={{ selected: filled } as AccessibilityState}
      hitSlop={10}
    >
      <Image source={starImage} style={[styles.starIcon, styles.starState(filled)]} accessible={false} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    justifyContent: "center",
  },
  starIcon: {
    width: 27,
    height: 25,
    resizeMode: "contain",
    tintColor: "lightgrey",
    opacity: 0.9,
  },
  liquidGlass: {
    padding: 10,
    borderRadius: 50,
  },
  starState: (filled: boolean) => (filled ? { tintColor: theme.colors.yellow, opacity: 0.75 } : { tintColor: "lightgrey" }),
}))
