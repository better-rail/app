import React from "react"
import { Image, Pressable, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, type TxKeyPath } from "@/i18n"
import { getAccentPalette, type AccentThemeId } from "@/theme/accent-themes"
import { darkTheme, lightTheme } from "@/theme/themes"

// Illustrated swatches; themes without one fall back to their two accent colors
const swatchImages: Partial<Record<AccentThemeId, number>> = {
  default: require("../../../../assets/theme-swatches/classic.webp"),
  telAviv: require("../../../../assets/theme-swatches/tel-aviv.webp"),
}

const labels: Record<AccentThemeId, TxKeyPath> = {
  default: "settings.accentThemeDefault",
  telAviv: "settings.accentThemeTelAviv",
  jerusalem: "settings.accentThemeJerusalem",
  haifa: "settings.accentThemeHaifa",
  beerSheva: "settings.accentThemeBeerSheva",
  neon: "settings.accentThemeNeon",
  pixel: "settings.accentThemePixel",
  newspaper: "settings.accentThemeNewspaper",
  retro: "settings.accentThemeRetro",
}

// Other themes are hidden for now
const visibleThemeIds: AccentThemeId[] = ["default", "telAviv"]

interface AccentThemePickerProps {
  value: AccentThemeId
  onChange: (value: AccentThemeId) => void
}

/** The themes as a row of swatches, starting with the classic look */
export function AccentThemePicker({ value, onChange }: AccentThemePickerProps) {
  const { rt } = useUnistyles()
  const appearance = rt.themeName === "dark" ? "dark" : "light"
  const base = appearance === "dark" ? darkTheme : lightTheme
  const colorsFor = (id: AccentThemeId) => getAccentPalette(id)?.[appearance] ?? base.colors

  const swatch = (id: AccentThemeId) => {
    const image = swatchImages[id]
    if (image) return <Image source={image} style={[styles.swatch, styles.swatchImage]} />

    return (
      <View style={[styles.swatch, styles.split]}>
        <View style={[styles.half, { backgroundColor: colorsFor(id).primary }]} />
        <View style={[styles.half, { backgroundColor: colorsFor(id).secondary }]} />
      </View>
    )
  }

  return (
    <View accessibilityRole="radiogroup" testID="accent-theme-picker">
      <View style={styles.row}>
        {visibleThemeIds.map((id) => {
          const selected = id === value

          return (
            <Pressable
              key={id}
              style={styles.option}
              onPress={() => onChange(id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={translate(labels[id]) ?? ""}
              testID={`accent-theme-${id}`}
            >
              <View style={[styles.ring, selected && { borderColor: colorsFor(id).primary }]}>{swatch(id)}</View>
              <Text style={[styles.label, selected && styles.selectedLabel]} tx={labels[id]} numberOfLines={1} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const SWATCH_SIZE = 44

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
  },
  option: {
    width: "25%",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  ring: {
    padding: 3,
    borderRadius: SWATCH_SIZE,
    borderWidth: 2.5,
    borderColor: "transparent",
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
  split: {
    overflow: "hidden",
    flexDirection: "row",
    transform: [{ rotate: "-45deg" }],
  },
  half: {
    flex: 1,
  },
  // Keeps the paper-white edges from melting into a light page
  swatchImage: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.separator,
  },
  label: {
    fontSize: 13,
    color: theme.colors.label,
  },
  selectedLabel: {
    color: theme.colors.text,
    fontWeight: "600",
  },
}))
