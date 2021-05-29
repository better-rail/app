import { PixelRatio, Appearance } from "react-native"

export * from "./color"
export * from "./spacing"
export * from "./typography"
export * from "./timing"

export const fontScale = PixelRatio.getFontScale()
export const isDarkMode = Appearance.getColorScheme() === "dark"
