import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect"

/**
 * Whether the app renders with the iOS 26 Liquid Glass design.
 * The API check guards iOS 26 betas where `UIGlassEffect` is missing and constructing it crashes.
 */
export const isLiquidGlassSupported = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
