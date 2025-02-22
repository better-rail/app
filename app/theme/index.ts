import { PixelRatio, Appearance } from "react-native"
import analytics from "@react-native-firebase/analytics"

export * from "./color"
export * from "./spacing"
export * from "./typography"
export * from "./timing"

export const fontScale = PixelRatio.getFontScale()
const colorScheme = Appearance.getColorScheme()
export const isDarkMode = colorScheme === "dark"

analytics().setUserProperties({ color_scheme: colorScheme, font_scale: `${fontScale}` })
