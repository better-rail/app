import React from "react"
import { Image, Pressable, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, type TxKeyPath } from "@/i18n"
import { cityThemeIds, getAccentPalette, specialThemeIds, type AccentThemeId } from "@/theme/accent-themes"
import { darkTheme, lightTheme } from "@/theme/themes"
import { subheadingFontStyle } from "@/theme/theme-fonts"

const checkmarkIcon = require("../../../../assets/checkmark.png")

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

const groups: { title: TxKeyPath; ids: readonly AccentThemeId[] }[] = [
  { title: "settings.themeGroupCities", ids: cityThemeIds },
  { title: "settings.themeGroupSpecial", ids: specialThemeIds },
]

interface AccentThemePickerProps {
  value: AccentThemeId
  onChange: (value: AccentThemeId) => void
}

/** The classic look as a plain row, then the themes grouped into cities and specials */
export function AccentThemePicker({ value, onChange }: AccentThemePickerProps) {
  const { rt } = useUnistyles()
  const appearance = rt.themeName === "dark" ? "dark" : "light"
  const base = appearance === "dark" ? darkTheme : lightTheme
  const colorsFor = (id: AccentThemeId) => getAccentPalette(id)?.[appearance] ?? base.colors

  const swatch = (id: AccentThemeId, size: number) => (
    <View style={[styles.swatch, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.half, { backgroundColor: colorsFor(id).primary }]} />
      <View style={[styles.half, { backgroundColor: colorsFor(id).secondary }]} />
    </View>
  )

  return (
    <View accessibilityRole="radiogroup" testID="accent-theme-picker">
      <Pressable
        style={styles.classicRow}
        onPress={() => onChange("default")}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === "default" }}
        accessibilityLabel={translate(labels.default) ?? ""}
        testID="accent-theme-default"
      >
        {swatch("default", 28)}
        <Text style={styles.classicLabel} tx={labels.default} />
        {value === "default" && <Image source={checkmarkIcon} style={styles.checkmark} />}
      </Pressable>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle} tx={group.title} />
          <View style={styles.row}>
            {group.ids.map((id) => {
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
                  <View style={[styles.ring, selected && { borderColor: colorsFor(id).primary }]}>{swatch(id, SWATCH_SIZE)}</View>
                  <Text style={[styles.label, selected && styles.selectedLabel]} tx={labels[id]} numberOfLines={1} />
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const SWATCH_SIZE = 44

const styles = StyleSheet.create((theme, rt) => ({
  // Matches the SettingBox rows below it
  classicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: rt.themeName === "dark" ? theme.colors.inputPlaceholderBackground : theme.colors.background,
  },
  classicLabel: {
    flex: 1,
    fontSize: 16.5,
  },
  checkmark: {
    width: 19.5,
    height: 19.5,
    tintColor: theme.colors.primary,
  },
  group: {
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  groupTitle: {
    marginStart: 20,
    marginBottom: theme.spacing[2],
    ...subheadingFontStyle(theme, 13, "600"),
    color: theme.colors.label,
  },
  row: {
    flexDirection: "row",
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
    overflow: "hidden",
    flexDirection: "row",
    transform: [{ rotate: "-45deg" }],
  },
  half: {
    flex: 1,
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
