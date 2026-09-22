import { useColorScheme } from "react-native"
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect"
import { palette } from "@/theme/palette"

export const isLiquidGlassSupported = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()

// GlassView accepts a CSS color string, while the app's color roles use native ColorValue objects.
const glassTints = {
  primary: [palette.blue, "#0A84FF"],
  secondary: [palette.pinky, "#6F68DF"],
  secondaryLighter: [palette.orangeLighter, "#464552"],
  secondaryBackground: [palette.white, "#000000"],
  success: ["#34C759", "#30D158"],
  disabled: ["#AEAEB2", "#48484A"],
  stop: ["#FF3B30", "#FF453A"],
  transparent: ["transparent", "transparent"],
} as const

export function useGlassTint(role: keyof typeof glassTints): string {
  return glassTints[role][useColorScheme() === "dark" ? 1 : 0]
}
