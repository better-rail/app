import { TouchableOpacity, type ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"

const CHIP_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3] * fontScale,
  paddingVertical: spacing[0] + 1 * fontScale,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 30,
}

const VARIANTS = {
  success: color.success,
  primary: color.primary,
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
    <TouchableOpacity style={[CHIP_WRAPPER, { backgroundColor: VARIANTS[variant] }, style]} onPress={onPress}>
      {children}
    </TouchableOpacity>
  )
}
