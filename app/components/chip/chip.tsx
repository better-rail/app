import { TouchableOpacity, type ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"

const CHIP_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3] * fontScale,
  paddingVertical: spacing[0] + 1 * fontScale,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 30,
  borderWidth: 1,
  borderColor: "transparent",
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
