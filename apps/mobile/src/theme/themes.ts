import { Platform, PlatformColor, type ColorValue } from "react-native"
import { palette } from "./palette"
import { spacing } from "./spacing"
import { typography } from "./typography"
import { timing } from "./timing"

/**
 * Unistyles resolves theme colors when it creates native styles. Android resource
 * colors (@color/...) can therefore stay at their light value after a live OS
 * appearance change. Give each theme concrete Android values instead. Keep these
 * in sync with res/values and res/values-night/betterrail_colors.xml; imperative
 * colors in color.ts still use those resources directly.
 */
const androidColors = {
  light: {
    background: "#f2f2f7",
    secondaryBackground: "#ffffff",
    text: "#111111",
    label: "#757575",
    placeholder: "#afb4bd",
    inputBackground: "#ffffff",
    inputPlaceholderBackground: "#e0e1e6",
    disabled: "#aeaeb2",
    link: "#2196F3",
    separator: "#bdbdc2",
    whiteText: "#ffffff",
    primary: "#2196f3",
    secondary: "#fa827e",
    secondaryLighter: "#f6eae3",
    dimmer: "#e0e1e6",
    grey: "#8F8D93",
    greenText: "#219f07",
    greenBackground: "#e4ffdd",
    contrastedGreenBackground: "#c7eebe",
    stop: "#FF5252",
  },
  dark: {
    background: "#1c1c1e",
    secondaryBackground: "#000000",
    text: "#ffffff",
    label: "#98989f",
    placeholder: "#afb4bd",
    inputBackground: "#2c2c2e",
    inputPlaceholderBackground: "#3a3a3c",
    disabled: "#48484a",
    link: "#0c83ff",
    separator: "#3e3e41",
    whiteText: "#ffffff",
    primary: "#0c83ff",
    secondary: "#6F68DF",
    secondaryLighter: "#464552",
    dimmer: "#3a3a3c",
    grey: "#e0e1e6",
    greenText: "#8fdc7b",
    greenBackground: "#475a42",
    contrastedGreenBackground: "#5d7557",
    stop: "#FF5252",
  },
} as const

type Appearance = keyof typeof androidColors

const createColors = (appearance: Appearance) => {
  const android = androidColors[appearance]
  const dark = appearance === "dark"
  const nativeColor = (ios: ColorValue, androidValue: string): ColorValue =>
    Platform.select({ ios, android: androidValue }) as ColorValue

  return {
    palette,
    transparent: "rgba(0, 0, 0, 0)" as ColorValue,
    background: nativeColor(PlatformColor("secondarySystemBackground"), android.background),
    secondaryBackground: nativeColor(PlatformColor("systemBackground"), android.secondaryBackground),
    tertiaryBackground: nativeColor(PlatformColor("tertiarySystemBackground"), android.background),
    modalBackground: nativeColor(PlatformColor(dark ? "systemBackground" : "secondarySystemBackground"), android.background),
    primary: nativeColor(PlatformColor("systemBlue"), android.primary),
    primaryLighter: palette.blueLighter as ColorValue,
    primaryDarker: palette.blueDarker as ColorValue,
    secondary: nativeColor(dark ? "#6F68DF" : palette.pinky, android.secondary),
    secondaryLighter: nativeColor(dark ? "#464552" : palette.orangeLighter, android.secondaryLighter),
    inputBackground: nativeColor(dark ? palette.darkGrey : palette.white, android.inputBackground),
    line: palette.offWhite as ColorValue,
    text: nativeColor(PlatformColor("label"), android.text),
    label: nativeColor(PlatformColor("secondaryLabel"), android.label),
    placeholder: nativeColor(PlatformColor("placeholderText"), android.placeholder),
    whiteText: nativeColor(dark ? palette.offWhite : palette.white, android.whiteText),
    inputPlaceholderBackground: nativeColor(
      dark ? PlatformColor("systemGray4") : palette.lighterGrey,
      android.inputPlaceholderBackground,
    ),
    disabled: nativeColor(PlatformColor(dark ? "systemGray3" : "systemGray2"), android.disabled),
    link: nativeColor(PlatformColor("link"), android.link),
    separator: nativeColor(PlatformColor("separator"), android.separator),
    success: nativeColor(PlatformColor("systemGreen"), "#4daf50"),
    destroy: nativeColor(PlatformColor("systemRed"), "#FF5252"),
    dim: palette.lightGrey as ColorValue,
    dimmer: nativeColor(dark ? PlatformColor("systemGray4") : palette.lighterGrey, android.dimmer),
    error: palette.angry as ColorValue,
    yellow: nativeColor(PlatformColor("systemYellow"), "#f1c40f"),
    grey: nativeColor(dark ? palette.lighterGrey : "#8F8D93", android.grey),
    greenText: nativeColor(dark ? palette.greenDarkText : palette.greenLightText, android.greenText),
    greenBackground: nativeColor(dark ? palette.greenDarkBg : palette.greenLightBg, android.greenBackground),
    contrastedGreenBackground: nativeColor(dark ? "#5D7557" : "#C7EEBE", android.contrastedGreenBackground),
    stop: nativeColor(dark ? "#bb645b" : palette.pinky, android.stop),
  }
}

const sharedTokens = { spacing, typography, timing }

export const lightTheme = { colors: createColors("light"), ...sharedTokens }
export const darkTheme: typeof lightTheme = { colors: createColors("dark"), ...sharedTokens }

export type AppTheme = typeof lightTheme
