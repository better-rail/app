import { type AccessibilityProps, Pressable, TouchableOpacity, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { color } from "@/theme"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported, useGlassTint } from "@/utils/liquid-glass"

const VARIANTS = {
  success: color.success,
  primary: color.primary,
  default: color.secondaryBackground,
  transparent: "transparent",
}

interface ChipProps extends Pick<
  AccessibilityProps,
  "accessibilityLabel" | "accessibilityRole" | "accessibilityState" | "accessibilityHint"
> {
  children: React.ReactNode
  variant: keyof typeof VARIANTS
  onPress: () => void
  icon?: React.ReactNode
  style?: ViewStyle
  testID?: string
}

/**
 * A pill that can be tapped. The accessibility props land on the pressable itself, so a chip used as a
 * radio or checkbox reads its role and state to a screen reader rather than only its text.
 */
export function Chip({ children, variant, onPress, style, testID, ...accessibility }: ChipProps) {
  const glassTint = useGlassTint(variant === "default" ? "secondaryBackground" : variant)
  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} testID={testID} {...accessibility}>
        <GlassView
          isInteractive
          style={[variant === "transparent" ? styles.transparentChipWrapper : styles.chipWrapper, style]}
          tintColor={glassTint}
        >
          {children}
        </GlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        variant === "transparent" ? styles.transparentChipWrapper : styles.chipWrapper,
        { backgroundColor: VARIANTS[variant] },
        style,
      ]}
      onPress={onPress}
      testID={testID}
      {...accessibility}
    >
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  chipWrapper: {
    paddingHorizontal: theme.spacing[3] * Math.min(rt.fontScale, 1.5),
    paddingVertical: (rt.fontScale > 1 ? 1 : 0) * rt.fontScale,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "transparent",
  },
  transparentChipWrapper: {
    paddingHorizontal: theme.spacing[3] * Math.min(rt.fontScale, 1.5),
    paddingVertical: (rt.fontScale > 1 ? 1 : 0) * rt.fontScale,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    backgroundColor: "transparent",
    borderColor: theme.colors.separator,
  },
}))
