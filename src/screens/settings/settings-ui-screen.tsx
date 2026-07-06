import React, { useEffect } from "react"
import { Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { RouteCardPreview, Screen, Text } from "@/components"
import { RouteCardHeight, RouteCardHeightWithHeader } from "@/components/route-card/route-card"
import { SettingBox } from "./components/settings-box"
import { spacing } from "@/theme"
import { translate } from "@/i18n"
import { SETTING_GROUP, SETTING_GROUP_TITLE } from "./settings-styles"
import { useIsDarkMode } from "@/hooks"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { setAnalyticsUserProperty, trackEvent } from "@/services/analytics"

export function UISettingsScreen() {
  const isDarkMode = useIsDarkMode()
  const { showRouteCardHeader, setShowRouteCardHeader } = useSettingsStore(
    useShallow((s) => ({ showRouteCardHeader: s.showRouteCardHeader, setShowRouteCardHeader: s.setShowRouteCardHeader }))
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

  return (
    <Screen
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <Text style={SETTING_GROUP_TITLE} tx="settings.routeCard" />
      <Animated.View style={animatedCardStyle}>
        <RouteCardPreview style={styles.routeCard} />
      </Animated.View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.showRouteCardHeader")}
          toggle
          toggleValue={showRouteCardHeader}
          onToggle={onRouteCardHeaderToggle}
        />
      </View>
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
    marginBottom: theme.spacing[4],
    backgroundColor: theme.colors.secondaryBackground,
  },
}))
