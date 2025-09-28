import { ViewStyle } from "react-native"
import { color, spacing } from "../../theme"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

const borderRadius = isLiquidGlassSupported ? 16 : 10
export const settingsBorderRadius = borderRadius

export const SETTING_GROUP: ViewStyle = {
  marginBottom: spacing[4],
  borderRadius,
  borderCurve: "continuous",
  backgroundColor: color.secondaryBackground,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 0.25,
  shadowOpacity: 0.2,
  elevation: 1,
}
