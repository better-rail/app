import { Platform, PlatformColor, type ColorValue } from "react-native"
import { palette } from "./palette"
import { spacing } from "./spacing"
import { typography } from "./typography"
import { timing } from "./timing"

/**
 * Unistyles theme definitions.
 *
 * These mirror the color roles in `./color.ts`, but split per appearance so Unistyles
 * `adaptiveThemes` can serve the right values. The mapping is lossless:
 *
 *  - `PlatformColor(...)` roles self-adapt natively, so they are IDENTICAL in both themes.
 *  - `DynamicColorIOS({ light, dark })` roles are split into their `light`/`dark` halves.
 *  - On Android every role keeps its `@color/...` resource (those self-adapt via `values-night/`),
 *    so the Android value is identical in both themes too.
 *
 * Use these inside styles via `StyleSheet.create(theme => ({ ... }))`. For imperative
 * color props (passed to native/3rd-party components, navigation options, etc.) keep using
 * the self-adapting `color` object from `./color.ts`.
 *
 * NOTE: keep the roles here in sync with `./color.ts`.
 */

// iOS gets an explicit color; Android resolves a (night-aware) resource color.
const adaptive = (iosValue: ColorValue, androidColor: `@color/${string}`): ColorValue =>
  Platform.select({ ios: iosValue, android: PlatformColor(androidColor) }) as ColorValue

/**
 * Roles that look the same in light and dark — either native self-adapting `PlatformColor`s
 * or appearance-independent palette/static values.
 */
const sharedColors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)" as ColorValue,

  background: adaptive(PlatformColor("secondarySystemBackground"), "@color/background"),
  secondaryBackground: adaptive(PlatformColor("systemBackground"), "@color/secondaryBackground"),
  tertiaryBackground: adaptive(PlatformColor("tertiarySystemBackground"), "@color/background"),

  primary: adaptive(PlatformColor("systemBlue"), "@color/blue"),
  primaryLighter: palette.blueLighter as ColorValue,
  primaryDarker: palette.blueDarker as ColorValue,

  line: palette.offWhite as ColorValue,

  text: adaptive(PlatformColor("label"), "@color/label"),
  label: adaptive(PlatformColor("secondaryLabel"), "@color/secondaryLabel"),
  placeholder: adaptive(PlatformColor("placeholderText"), "@color/placeholderText"),

  link: adaptive(PlatformColor("link"), "@color/link"),
  separator: adaptive(PlatformColor("separator"), "@color/separator"),

  success: adaptive(PlatformColor("systemGreen"), "@color/green"),
  destroy: adaptive(PlatformColor("systemRed"), "@color/red"),

  dim: palette.lightGrey as ColorValue,
  error: palette.angry as ColorValue,

  yellow: adaptive(PlatformColor("systemYellow"), "@color/yellow"),
}

/** Roles that differ between appearances (the `DynamicColorIOS` halves). */
const lightColors = {
  ...sharedColors,
  modalBackground: adaptive(PlatformColor("secondarySystemBackground"), "@color/background"),
  secondary: adaptive(palette.pinky, "@color/pinky"),
  secondaryLighter: adaptive(palette.orangeLighter, "@color/lightPinky"),
  inputBackground: adaptive(palette.white, "@color/inputBackground"),
  whiteText: adaptive(palette.white, "@color/whiteText"),
  inputPlaceholderBackground: adaptive(palette.lighterGrey, "@color/inputPlaceholderBackground"),
  disabled: adaptive(PlatformColor("systemGray2"), "@color/disabled"),
  dimmer: adaptive(palette.lighterGrey, "@color/lightGrey"),
  grey: adaptive("#8F8D93", "@color/grey"),
  greenText: adaptive(palette.greenLightText, "@color/greenText"),
  greenBackground: adaptive(palette.greenLightBg, "@color/greenBg"),
  contrastedGreenBackground: adaptive("#C7EEBE", "@color/contrastedGreenBg"),
  stop: adaptive(palette.pinky, "@color/red"),
}

const darkColors: typeof lightColors = {
  ...sharedColors,
  modalBackground: adaptive(PlatformColor("systemBackground"), "@color/background"),
  secondary: adaptive("#6F68DF", "@color/pinky"),
  secondaryLighter: adaptive("#464552", "@color/lightPinky"),
  inputBackground: adaptive(palette.darkGrey, "@color/inputBackground"),
  whiteText: adaptive(palette.offWhite, "@color/whiteText"),
  inputPlaceholderBackground: adaptive(PlatformColor("systemGray4"), "@color/inputPlaceholderBackground"),
  disabled: adaptive(PlatformColor("systemGray3"), "@color/disabled"),
  dimmer: adaptive(PlatformColor("systemGray4"), "@color/lightGrey"),
  grey: adaptive(palette.lighterGrey, "@color/grey"),
  greenText: adaptive(palette.greenDarkText, "@color/greenText"),
  greenBackground: adaptive(palette.greenDarkBg, "@color/greenBg"),
  contrastedGreenBackground: adaptive("#5D7557", "@color/contrastedGreenBg"),
  stop: adaptive("#bb645b", "@color/red"),
}

// Appearance-independent design tokens shared by every theme.
const sharedTokens = {
  spacing,
  typography,
  timing,
}

export const lightTheme = {
  colors: lightColors,
  ...sharedTokens,
}

export const darkTheme: typeof lightTheme = {
  colors: darkColors,
  ...sharedTokens,
}

export type AppTheme = typeof lightTheme
