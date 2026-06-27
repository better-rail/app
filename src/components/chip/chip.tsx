import { Pressable, TouchableOpacity, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { color } from "@/theme"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const VARIANTS = {
  success: color.success,
  primary: color.primary,
  default: color.secondaryBackground,
  transparent: "transparent",
}

interface ChipProps {
  children: React.ReactNode
  variant: keyof typeof VARIANTS
  onPress: () => void
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Chip({ children, variant, onPress, style }: ChipProps) {
  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress}>
        <LiquidGlassView
          interactive
          style={[variant === "transparent" ? styles.transparentChipWrapper : styles.chipWrapper, style]}
          tintColor={VARIANTS[variant]}
        >
          {children}
        </LiquidGlassView>
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
