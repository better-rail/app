import { Image, View, type ImageSourcePropType } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { useSettingsStore } from "@/models"
import type { AccentThemeId } from "@/theme/accent-themes"

// Each theme's doodle is split into two white masks, tinted with the theme's primary and secondary colors
const backgrounds: Record<AccentThemeId, { primary: ImageSourcePropType; secondary: ImageSourcePropType }> = {
  default: {
    primary: require("../../../assets/backgrounds/classic-primary.png"),
    secondary: require("../../../assets/backgrounds/classic-secondary.png"),
  },
  telAviv: {
    primary: require("../../../assets/backgrounds/tel-aviv-primary.png"),
    secondary: require("../../../assets/backgrounds/tel-aviv-secondary.png"),
  },
  jerusalem: {
    primary: require("../../../assets/backgrounds/jerusalem-primary.png"),
    secondary: require("../../../assets/backgrounds/jerusalem-secondary.png"),
  },
  haifa: {
    primary: require("../../../assets/backgrounds/haifa-primary.png"),
    secondary: require("../../../assets/backgrounds/haifa-secondary.png"),
  },
  beerSheva: {
    primary: require("../../../assets/backgrounds/beer-sheva-primary.png"),
    secondary: require("../../../assets/backgrounds/beer-sheva-secondary.png"),
  },
  neon: {
    primary: require("../../../assets/backgrounds/neon-primary.png"),
    secondary: require("../../../assets/backgrounds/neon-secondary.png"),
  },
  pixel: {
    primary: require("../../../assets/backgrounds/pixel-primary.png"),
    secondary: require("../../../assets/backgrounds/pixel-secondary.png"),
  },
  newspaper: {
    primary: require("../../../assets/backgrounds/newspaper-primary.png"),
    secondary: require("../../../assets/backgrounds/newspaper-secondary.png"),
  },
  retro: {
    primary: require("../../../assets/backgrounds/retro-primary.png"),
    secondary: require("../../../assets/backgrounds/retro-secondary.png"),
  },
}

// The screen background (secondarySystemBackground) as RGB, so the fade can blend into it
const backgroundRgb = { light: "242, 242, 247", dark: "28, 28, 30" }

/**
 * How much of the art to wash out with the screen background:
 * - edges: full art at the top and bottom, dimmed behind a form in the middle
 * - uniform: dimmed everywhere, for text that sits on the background
 * - none: full art, for screens whose content sits on opaque cards
 */
const fades = {
  edges: { locations: [0, 0.12, 0.3, 0.75, 0.92, 1], alphas: [0, 0, 0.5, 0.5, 0, 0] },
  uniform: { locations: [0, 1], alphas: [0.5, 0.5] },
}

// Themes with their own surfaces set background as a hex string; the system ones are platform colors
const hexToRgb = (value: unknown) => {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return undefined
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).join(", ")
}

export type ThemeBackgroundFade = keyof typeof fades | "none"

export function ThemeBackground({ fade = "edges" }: { fade?: ThemeBackgroundFade }) {
  const { theme, rt } = useUnistyles()
  const accentTheme = useSettingsStore((s) => s.accentTheme)
  const showBackground = useSettingsStore((s) => s.showThemeBackground)

  if (!showBackground) return null

  const source = backgrounds[accentTheme]
  const rgb = hexToRgb(theme.colors.background) ?? backgroundRgb[rt.themeName === "dark" ? "dark" : "light"]

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.art}>
        <Image source={source.primary} style={[styles.layer, { tintColor: theme.colors.primary }]} resizeMode="cover" />
        <Image source={source.secondary} style={[styles.layer, { tintColor: theme.colors.secondary }]} resizeMode="cover" />
      </View>
      {fade !== "none" && (
        <LinearGradient
          style={styles.layer}
          colors={fades[fade].alphas.map((alpha) => `rgba(${rgb}, ${alpha})`)}
          locations={fades[fade].locations}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create((_theme, rt) => ({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  art: {
    ...StyleSheet.absoluteFillObject,
    opacity: rt.themeName === "dark" ? 0.16 : 0.12,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
}))
