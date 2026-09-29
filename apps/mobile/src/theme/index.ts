import { PixelRatio, Appearance } from "react-native"
import { setAnalyticsUserProperties } from "@/services/analytics"

export * from "./color"
export * from "./spacing"
export * from "./typography"
export * from "./timing"

export const fontScale = PixelRatio.getFontScale()
const colorScheme = Appearance.getColorScheme()

setAnalyticsUserProperties({ color_scheme: colorScheme ?? "unspecified", font_scale: `${fontScale}` })
