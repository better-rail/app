import { Pressable, TouchableOpacity, type ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const CHIP_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3] * Math.min(fontScale, 1.5),
  paddingVertical: (fontScale > 1 ? 1 : 0) * fontScale,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 30,
  borderWidth: 1,
  borderColor: "transparent",
  overflow: "hidden",
}

const TRANSPARENT_CHIP_WRAPPER: ViewStyle = {
  ...CHIP_WRAPPER,
  backgroundColor: "transparent",
  borderColor: color.separator,
}

const VARIANTS = {
  success: color.success,
  primary: color.primary,
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
          style={variant === "transparent" ? TRANSPARENT_CHIP_WRAPPER : CHIP_WRAPPER}
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
      style={[variant === "transparent" ? TRANSPARENT_CHIP_WRAPPER : CHIP_WRAPPER, { backgroundColor: VARIANTS[variant] }, style]}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  )
}
