import { TextStyle, ViewStyle } from "react-native"
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

export const SETTING_GROUP_TITLE: TextStyle = {
  marginStart: spacing[3],
  marginBottom: spacing[0],
  color: color.label,
  fontSize: 16,
  fontWeight: "600",
}
