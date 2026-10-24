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
      colors: {
        ...base.colors,
        ...(themed?.accents as Record<string, ColorValue> | undefined),
        ...(themed?.surfaces as Record<string, ColorValue> | undefined),
      },
      skin: {
        ...themed?.skin,
        timeFont: useAlternateTimeFont ? definition?.alternateTimeFont?.font : undefined,
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
