import React, { useEffect } from "react"
import { Appearance, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { RouteCardPreview, Screen, Text } from "@/components"
import { RouteCardHeight, RouteCardHeightWithHeader } from "@/components/route-card/route-card"
import { SettingBox } from "./components/settings-box"
import { ColorSchemePicker } from "./components/color-scheme-picker"
import { AccentThemePicker } from "./components/accent-theme-picker"
import { TimeFontPicker } from "./components/time-font-picker"
import { ThemeBackground } from "@/components/theme-background/theme-background"
import { spacing } from "@/theme"
import { translate } from "@/i18n"
import { settingsStyles } from "./settings-styles"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import type { ColorSchemePreference } from "@/models/settings/settings"
import { getAlternateTimeFont, type AccentThemeId } from "@/theme/accent-themes"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { setAnalyticsUserProperty, trackEvent } from "@/services/analytics"
import { isHourIndexSupported } from "@/utils/hour-index"
import { isAccentThemeSupported } from "@/utils/accent-theme-support"
import { subheadingFontStyle } from "@/theme/theme-fonts"

export function UISettingsScreen() {
  const {
    showRouteCardHeader,
    setShowRouteCardHeader,
    showHourIndex,
    setShowHourIndex,
    colorScheme,
    setColorScheme,
    accentTheme,
    setAccentTheme,
    showThemeBackground,
    setShowThemeBackground,
    useAlternateTimeFont,
    setUseAlternateTimeFont,
  } = useSettingsStore(
    useShallow((s) => ({
      showRouteCardHeader: s.showRouteCardHeader,
      setShowRouteCardHeader: s.setShowRouteCardHeader,
      showHourIndex: s.showHourIndex,
      setShowHourIndex: s.setShowHourIndex,
      colorScheme: s.colorScheme,
      setColorScheme: s.setColorScheme,
      accentTheme: s.accentTheme,
      setAccentTheme: s.setAccentTheme,
      showThemeBackground: s.showThemeBackground,
      setShowThemeBackground: s.setShowThemeBackground,
      useAlternateTimeFont: s.useAlternateTimeFont,
      setUseAlternateTimeFont: s.setUseAlternateTimeFont,
    })),
  )

  // Animate card container height based on header visibility
  const cardHeight = useSharedValue(showRouteCardHeader ? RouteCardHeightWithHeader : RouteCardHeight)

  useEffect(() => {
    cardHeight.value = withTiming(showRouteCardHeader ? RouteCardHeightWithHeader : RouteCardHeight, { duration: 300 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRouteCardHeader])

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      // The padding leaves room for a skinned card's glow inside the clip
      height: cardHeight.value + spacing[3] * 2,
      overflow: "hidden" as const,
    }
  })

  const onRouteCardHeaderToggle = (value: boolean) => {
    if (value) {
      trackEvent("route_card_header_enabled", { source: "settings" })
      setAnalyticsUserProperty("route_card_header_enabled", "true")
    } else {
      trackEvent("route_card_header_disabled", { source: "settings" })
      setAnalyticsUserProperty("route_card_header_enabled", "false")
    }
    setShowRouteCardHeader(value)
  }

  const onHourIndexToggle = (value: boolean) => {
    trackEvent(value ? "hour_index_enabled" : "hour_index_disabled", { source: "settings" })
    setAnalyticsUserProperty("hour_index_enabled", value ? "true" : "false")
    setShowHourIndex(value)
  }

  const onColorSchemeChange = (preference: ColorSchemePreference) => {
    if (preference === colorScheme) return
    setColorScheme(preference)
    trackEvent("color_scheme_changed", {
      source: "settings",
      previous_preference: colorScheme,
      color_scheme_preference: preference,
      color_scheme: Appearance.getColorScheme() ?? "unspecified",
    })
  }

  const onAccentThemeChange = (theme: AccentThemeId) => {
    if (theme === accentTheme) return
    setAccentTheme(theme)
    trackEvent("accent_theme_changed", { source: "settings", previous_theme: accentTheme, accent_theme: theme })
    setAnalyticsUserProperty("accent_theme", theme)
  }

  const onThemeBackgroundToggle = (value: boolean) => {
    trackEvent(value ? "theme_background_enabled" : "theme_background_disabled", {
      source: "settings",
      accent_theme: accentTheme,
    })
    setAnalyticsUserProperty("theme_background_enabled", value ? "true" : "false")
    setShowThemeBackground(value)
  }

  const alternateTimeFont = getAlternateTimeFont(accentTheme)

  const onTimeFontChange = (useAlternate: boolean) => {
    if (useAlternate === useAlternateTimeFont) return
    trackEvent("time_font_changed", { source: "settings", accent_theme: accentTheme, alternate: useAlternate })
    setUseAlternateTimeFont(useAlternate)
  }

  return (
    <Screen
      testID="appearance-settings-screen"
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
    >
      {/* A live preview of the background while picking a theme */}
      <ThemeBackground fade="uniform" />
      <Text style={styles.groupTitle} tx="settings.routeCard" />
      <View style={settingsStyles.group}>
        <Animated.View style={[styles.preview, animatedCardStyle]}>
          <RouteCardPreview cardStyle={styles.routeCard} />
        </Animated.View>
        <SettingBox
          testID="settings-show-train-info"
          last
          title={translate("settings.showRouteCardHeader") ?? ""}
          toggle
          toggleValue={showRouteCardHeader}
          onToggle={onRouteCardHeaderToggle}
        />
      </View>

      {isAccentThemeSupported() && <Text style={styles.groupTitle} tx="settings.accentTheme" />}
      <View style={settingsStyles.group}>
        {isAccentThemeSupported() && (
          <>
            <AccentThemePicker value={accentTheme} onChange={onAccentThemeChange} />
            <SettingBox
              testID="settings-show-theme-background"
              title={translate("settings.themeBackground") ?? ""}
              toggle
              toggleValue={showThemeBackground}
              onToggle={onThemeBackgroundToggle}
            />
            {alternateTimeFont && (
              <TimeFontPicker alternate={alternateTimeFont} useAlternate={useAlternateTimeFont} onChange={onTimeFontChange} />
            )}
            <View style={styles.divider} />
          </>
        )}
        <ColorSchemePicker value={colorScheme} onChange={onColorSchemeChange} />
      </View>

      {isHourIndexSupported() && (
        <>
          <Text style={styles.groupTitle} tx="settings.routeList" />
          <View style={settingsStyles.group}>
            <SettingBox
              testID="settings-show-hour-index"
              first
              last
              title={translate("settings.showHourIndex") ?? ""}
              toggle
              toggleValue={showHourIndex}
              onToggle={onHourIndexToggle}
            />
          </View>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  preview: {
    padding: theme.spacing[3],
  },
  // Matches the line SettingBox draws between rows
  divider: {
    height: 1,
    backgroundColor: rt.themeName === "dark" ? theme.colors.inputPlaceholderBackground : theme.colors.background,
  },
  // Screen paints the page color; a background here (the scroll content) misses live theme switches
  root: {
    flex: 1,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  routeCard: {
    backgroundColor: theme.skin.routeCard?.background ?? theme.colors.background,
  },
  groupTitle: {
    marginStart: theme.spacing[3],
    color: theme.colors.label,
    ...subheadingFontStyle(theme, 16, "600"),
  },
}))
