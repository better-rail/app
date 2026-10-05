import React, { useEffect } from "react"
import { Appearance, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { RouteCardPreview, Screen, Text } from "@/components"
import { RouteCardHeight, RouteCardHeightWithHeader } from "@/components/route-card/route-card"
import { SettingBox } from "./components/settings-box"
import { ColorSchemePicker } from "./components/color-scheme-picker"
import { spacing } from "@/theme"
import { translate } from "@/i18n"
import { settingsStyles } from "./settings-styles"
import { useIsDarkMode } from "@/hooks"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import type { ColorSchemePreference } from "@/models/settings/settings"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { setAnalyticsUserProperty, trackEvent } from "@/services/analytics"
import { isHourIndexSupported } from "@/utils/hour-index"

export function UISettingsScreen() {
  const isDarkMode = useIsDarkMode()
  const { showRouteCardHeader, setShowRouteCardHeader, showHourIndex, setShowHourIndex, colorScheme, setColorScheme } =
    useSettingsStore(
      useShallow((s) => ({
        showRouteCardHeader: s.showRouteCardHeader,
        setShowRouteCardHeader: s.setShowRouteCardHeader,
        showHourIndex: s.showHourIndex,
        setShowHourIndex: s.setShowHourIndex,
        colorScheme: s.colorScheme,
        setColorScheme: s.setColorScheme,
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
      height: cardHeight.value,
      overflow: "hidden" as const,
      marginBottom: spacing[4],
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

  return (
    <Screen
      testID="appearance-settings-screen"
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={settingsStyles.group}>
        <ColorSchemePicker value={colorScheme} onChange={onColorSchemeChange} />
      </View>

      <Text style={styles.groupTitle} tx="settings.routeCard" />
      <Animated.View style={animatedCardStyle}>
        <RouteCardPreview cardStyle={styles.routeCard} />
      </Animated.View>

      <View style={settingsStyles.group}>
        <SettingBox
          testID="settings-show-train-info"
          first
          last
          title={translate("settings.showRouteCardHeader") ?? ""}
          toggle
          toggleValue={showRouteCardHeader}
          onToggle={onRouteCardHeaderToggle}
        />
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

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background,
  },
  routeCard: {
    backgroundColor: theme.colors.secondaryBackground,
  },
  groupTitle: {
    marginStart: theme.spacing[3],
    color: theme.colors.label,
    fontSize: 16,
    fontWeight: "600",
  },
}))
