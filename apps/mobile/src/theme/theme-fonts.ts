import type { TextStyle } from "react-native"
import type { AppTheme, ThemeFont } from "./themes"

// Every key is set so a theme switch resets them
const fontStyle = (font: ThemeFont | undefined, theme: AppTheme, size: number, weight: TextStyle["fontWeight"]) =>
  font
    ? { fontFamily: font.family, fontWeight: "normal" as const, fontSize: size * (font.scale ?? 1) }
    : { fontFamily: theme.typography.primary, fontWeight: weight, fontSize: size }

/** Headings use the theme's heading font, or Heebo at `weight` */
export const headingFontStyle = (theme: AppTheme, size: number, weight: TextStyle["fontWeight"] = "700") =>
  fontStyle(theme.skin.headingFont, theme, size, weight)

/** Station names in lists and section titles use the theme's subheading font, or Heebo at `weight` */
export const subheadingFontStyle = (theme: AppTheme, size: number, weight: TextStyle["fontWeight"] = "700") =>
  fontStyle(theme.skin.subheadingFont, theme, size, weight)

/** Passing stops use the theme's stop name font, or Heebo at `weight` */
export const stopNameFontStyle = (theme: AppTheme, size: number, weight: TextStyle["fontWeight"] = "600") =>
  fontStyle(theme.skin.stopNameFont, theme, size, weight)

/** Button titles use the theme's button font, or Heebo at `weight` */
export const buttonFontStyle = (theme: AppTheme, size: number, weight: TextStyle["fontWeight"] = "700") =>
  fontStyle(theme.skin.buttonFont, theme, size, weight)

/** Labels use the theme's label font, or Heebo at `weight` */
export const labelFontStyle = (theme: AppTheme, size: number, weight: TextStyle["fontWeight"] = "normal") =>
  fontStyle(theme.skin.labelFont, theme, size, weight)
