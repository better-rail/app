import { TouchableOpacity, type ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { StyleSheet } from "react-native-unistyles"

const CHIP_VARIANTS = {
  success: color.success,
  primary: color.primary,
  transparent: "transparent",
} as const

interface ChipProps {
  children: React.ReactNode
  variant: keyof typeof CHIP_VARIANTS
  onPress: () => void
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Chip({ children, variant, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity style={[stylesheet.chipWrapper(variant), style]} onPress={onPress}>
      {children}
    </TouchableOpacity>
  )
}

const stylesheet = StyleSheet.create({
  chipWrapper: (variant: keyof typeof CHIP_VARIANTS) => ({
    paddingHorizontal: spacing[3] * fontScale,
    paddingVertical: spacing[0] + 1 * fontScale,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: variant === "transparent" ? color.separator : undefined,
  }),
})
