import React from "react"
import { Pressable, Text, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "@/i18n"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

export interface FaresIconProps {
  style?: ViewStyle
  onPress: () => void
}

/** The route header's ticket-fares button: a shekel sign, styled like the filter icon next to it. */
export function FaresIcon(props: FaresIconProps) {
  const { onPress, style } = props
  const label = translate("fares.title") ?? undefined

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} style={[styles.container, style]} accessibilityRole="button" accessibilityLabel={label}>
        <LiquidGlassView interactive colorScheme="dark" tintColor="rgba(51, 51, 51, 0.9)" style={styles.liquidGlass}>
          <Text style={styles.glyph} accessible={false}>
            ₪
          </Text>
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
    >
      <Text style={styles.glyph} accessible={false}>
        ₪
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create(() => ({
  container: {
    justifyContent: "center",
  },
  liquidGlass: {
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 50,
  },
  glyph: {
    color: "lightgrey",
    fontSize: 22,
    fontWeight: "700",
    opacity: 0.9,
    includeFontPadding: false,
  },
}))
