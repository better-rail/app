import type { ColorValue } from "react-native"
import { UnistylesRuntime } from "react-native-unistyles"
import { lightTheme, darkTheme, type AppTheme } from "./themes"
import { getThemeDefinition, type AccentThemeId } from "./accent-themes"

/** Rebuilds both registered themes from their base so switching back restores the system look. */
export function applyAccentTheme(id: AccentThemeId, useAlternateTimeFont = false) {
  const definition = getThemeDefinition(id)

  const build = (base: AppTheme, appearance: "light" | "dark"): AppTheme => {
    const themed = definition?.[appearance]
    return {
      ...base,
      hasOwnColors: definition !== undefined,
      colors: {
        ...base.colors,
        ...(themed?.accents as Record<string, ColorValue> | undefined),
        ...(themed?.surfaces as Record<string, ColorValue> | undefined),
        // Themes without their own accentText use their primary, so a theme's primary never leaks the system blue
        accentText: themed?.accents.accentText ?? themed?.accents.primary ?? base.colors.accentText,
      },
      skin: {
        ...themed?.skin,
        timeFont: (useAlternateTimeFont ? definition?.alternateTimeFont?.font : undefined) ?? definition?.timeFont,
        headingFont: definition?.headingFont,
        subheadingFont: definition?.subheadingFont,
        stopNameFont: definition?.stopNameFont,
        labelFont: definition?.labelFont,
        buttonFont: definition?.buttonFont,
      },
    }
  }

  UnistylesRuntime.updateTheme("light", () => build(lightTheme, "light"))
  UnistylesRuntime.updateTheme("dark", () => build(darkTheme, "dark"))
}
