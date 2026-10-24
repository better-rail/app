import React from "react"
import { Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, type TxKeyPath } from "@/i18n"
import type { ThemeTimeFont } from "@/theme/themes"

interface TimeFontPickerProps {
  /** The theme's alternate font and its name */
  alternate: { font: ThemeTimeFont; label: TxKeyPath }
  useAlternate: boolean
  onChange: (useAlternate: boolean) => void
}

/** Two mini departure boards previewing the route card times in each font */
export function TimeFontPicker({ alternate, useAlternate, onChange }: TimeFontPickerProps) {
  const options = [
    { useAlternate: false, label: "settings.timeFontStandard" as TxKeyPath },
    { useAlternate: true, label: alternate.label },
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.title} tx="settings.timeFont" />
      <View style={styles.row} accessibilityRole="radiogroup" testID="time-font-picker">
        {options.map((option) => {
          const selected = option.useAlternate === useAlternate

          return (
            <Pressable
              key={option.label}
              style={styles.option}
              onPress={() => onChange(option.useAlternate)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={translate(option.label) ?? ""}
              testID={`time-font-${option.useAlternate ? "alternate" : "standard"}`}
            >
              <View style={[styles.board, selected && styles.selectedBoard]}>
                <Text
                  style={[
                    styles.time,
                    option.useAlternate && {
                      fontFamily: alternate.font.family,
                      fontWeight: "normal",
                      fontSize: alternate.font.size,
                      letterSpacing: alternate.font.letterSpacing ?? 0,
                    },
                  ]}
                >
                  21:11
                </Text>
              </View>
              <Text style={[styles.label, selected && styles.selectedLabel]} tx={option.label} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  // A row inside the theme card, separated like the SettingBox rows around it
  container: {
    paddingTop: 16,
    paddingBottom: theme.spacing[4],
    // Lines the title up with the SettingBox titles
    paddingHorizontal: 20,
    gap: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: rt.themeName === "dark" ? theme.colors.inputPlaceholderBackground : theme.colors.background,
  },
  title: {
    fontSize: 16.5,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  option: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing[2],
  },
  board: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: theme.spacing[2],
    // Shaped like the theme's route card
    borderRadius: theme.skin.routeCard?.radius ?? 12,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.skin.routeCard?.background ?? theme.colors.inputBackground,
  },
  selectedBoard: {
    borderColor: theme.colors.primary,
  },
  time: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.skin.routeCard?.departureTime ?? theme.colors.text,
    lineHeight: 35,
    textShadowColor: theme.skin.routeCard?.timeGlow ? theme.skin.routeCard.departureTime : "transparent",
    textShadowRadius: theme.skin.routeCard?.timeGlow ? 8 : 0,
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
