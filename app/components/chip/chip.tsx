import { TouchableOpacity, ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"

const CHIP_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3] * fontScale,
  paddingVertical: spacing[0] + 1 * fontScale,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 30,
}

const COLORS = {
  success: color.success,
  primary: color.primary,
}

interface ChipProps {
  children: React.ReactNode
  color: keyof typeof COLORS
  onPress: () => void
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Chip({ children, color, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity style={[CHIP_WRAPPER, { backgroundColor: COLORS[color] }, style]} onPress={onPress}>
      {children}
    </TouchableOpacity>
  )
}
