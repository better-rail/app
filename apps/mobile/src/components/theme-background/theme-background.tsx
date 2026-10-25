import { Image, View, type ImageSourcePropType } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useSettingsStore } from "@/models"
import type { AccentThemeId } from "@/theme/accent-themes"

// Each theme's doodle is split into two white masks, tinted with the theme's primary and secondary colors
const backgrounds: Record<AccentThemeId, { primary: ImageSourcePropType; secondary: ImageSourcePropType }> = {
  default: {
    primary: require("../../../assets/backgrounds/classic-primary.webp"),
    secondary: require("../../../assets/backgrounds/classic-secondary.webp"),
  },
  telAviv: {
    primary: require("../../../assets/backgrounds/tel-aviv-primary.webp"),
    secondary: require("../../../assets/backgrounds/tel-aviv-secondary.webp"),
  },
  jerusalem: {
    primary: require("../../../assets/backgrounds/jerusalem-primary.webp"),
    secondary: require("../../../assets/backgrounds/jerusalem-secondary.webp"),
  },
  haifa: {
    primary: require("../../../assets/backgrounds/haifa-primary.webp"),
    secondary: require("../../../assets/backgrounds/haifa-secondary.webp"),
  },
  beerSheva: {
    primary: require("../../../assets/backgrounds/beer-sheva-primary.webp"),
    secondary: require("../../../assets/backgrounds/beer-sheva-secondary.webp"),
  },
  neon: {
    primary: require("../../../assets/backgrounds/neon-primary.webp"),
    secondary: require("../../../assets/backgrounds/neon-secondary.webp"),
  },
  pixel: {
    primary: require("../../../assets/backgrounds/pixel-primary.webp"),
    secondary: require("../../../assets/backgrounds/pixel-secondary.webp"),
  },
  newspaper: {
    primary: require("../../../assets/backgrounds/newspaper-primary.webp"),
    secondary: require("../../../assets/backgrounds/newspaper-secondary.webp"),
  },
  retro: {
    primary: require("../../../assets/backgrounds/retro-primary.webp"),
    secondary: require("../../../assets/backgrounds/retro-secondary.webp"),
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

// Tints and fades live in the stylesheet, so they switch with the rest of the theme instead of a render later
export function ThemeBackground({ fade = "edges" }: { fade?: ThemeBackgroundFade }) {
  const accentTheme = useSettingsStore((s) => s.accentTheme)
  const showBackground = useSettingsStore((s) => s.showThemeBackground)

  if (!showBackground) return null

  const source = backgrounds[accentTheme]

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.art}>
        <Image source={source.primary} style={[styles.layer, styles.primaryArt]} resizeMode="cover" />
        <Image source={source.secondary} style={[styles.layer, styles.secondaryArt]} resizeMode="cover" />
      </View>
      {fade !== "none" && <View style={[styles.layer, fade === "edges" ? styles.edgesFade : styles.uniformFade]} />}
    </View>
  )
}

const gradient = (rgb: string, { locations, alphas }: (typeof fades)[keyof typeof fades]) =>
  `linear-gradient(to bottom, ${alphas.map((alpha, i) => `rgba(${rgb}, ${alpha}) ${locations[i] * 100}%`).join(", ")})`

const styles = StyleSheet.create((theme, rt) => {
  const rgb = hexToRgb(theme.colors.background) ?? backgroundRgb[rt.themeName === "dark" ? "dark" : "light"]

  return {
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
    primaryArt: {
      tintColor: theme.colors.primary,
    },
    secondaryArt: {
      tintColor: theme.colors.secondary,
    },
    edgesFade: {
      experimental_backgroundImage: gradient(rgb, fades.edges),
    },
    uniformFade: {
      experimental_backgroundImage: gradient(rgb, fades.uniform),
    },
  }
})
