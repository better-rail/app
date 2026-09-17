import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect"

export const isLiquidGlassSupported = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
