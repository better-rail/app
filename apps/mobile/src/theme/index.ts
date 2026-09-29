import { PixelRatio } from "react-native"
import { setAnalyticsUserProperties } from "@/services/analytics"

export * from "./color"
export * from "./spacing"
export * from "./typography"
export * from "./timing"

export const fontScale = PixelRatio.getFontScale()

setAnalyticsUserProperties({ font_scale: `${fontScale}` })
