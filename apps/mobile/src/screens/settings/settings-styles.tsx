import { StyleSheet } from "react-native-unistyles"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

const borderRadius = isLiquidGlassSupported ? 16 : 10
export const settingsBorderRadius = borderRadius

export const settingsStyles = StyleSheet.create((theme) => ({
  group: {
    marginBottom: theme.spacing[4],
    borderRadius,
    borderCurve: "continuous",
    backgroundColor: theme.colors.secondaryBackground,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.dim,
    shadowRadius: 0.25,
    shadowOpacity: 0.2,
    elevation: 1,
  },
}))
