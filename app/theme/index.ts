import { PixelRatio, Appearance } from "react-native"
import { analytics } from "../services/firebase/analytics"

export * from "./color"
export * from "./spacing"
export * from "./typography"
export * from "./timing"

export const fontScale = PixelRatio.getFontScale()
const colorScheme = Appearance.getColorScheme()
export const isDarkMode = colorScheme === "dark"

// Ensure values are strings for analytics
const analyticsProperties = {
  color_scheme: colorScheme || "unknown",
  font_scale: `${fontScale}`
}
analytics.setUserProperties(analyticsProperties)
