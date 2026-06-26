import React, { useEffect } from "react"
import { Platform, View, type ViewStyle } from "react-native"
import { RouteCard, Screen, Text } from "../../components"
import { RouteCardHeight, RouteCardHeightWithHeader } from "../../components/route-card/route-card"
import { SettingBox } from "./components/settings-box"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { SETTING_GROUP, SETTING_GROUP_TITLE } from "./settings-styles"
import { useIsDarkMode } from "../../hooks"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "../../models"
import { formatRouteDuration, routeDurationInMs } from "../../utils/helpers/date-helpers"
import { RouteItem } from "../../services/api"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { setAnalyticsUserProperty, trackEvent } from "../../services/analytics"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
}

const routeItem: RouteItem = {
  delay: 0,
  isExchange: false,
  duration: formatRouteDuration(routeDurationInMs(new Date().getTime(), new Date().getTime() + 1000 * 60 * 26)),
  departureTime: new Date().getTime(),
  departureTimeString: new Date().toISOString(),
  arrivalTime: new Date().getTime() + 1000 * 60 * 26,
  arrivalTimeString: new Date().toISOString(),
  isMuchLonger: false,
  isMuchShorter: false,
  trains: [
    {
      originStationId: 1,
      originStationName: "Tel Aviv",
      destinationStationId: 2,
      destinationStationName: "Jerusalem",
      arrivalTime: new Date().getTime() + 1000 * 60 * 26,
      arrivalTimeString: new Date().toISOString(),
      departureTime: new Date().getTime(),
      departureTimeString: new Date().toISOString(),
      originPlatform: 3,
      destinationPlatform: 2,
      trainNumber: 364,
      stopStations: [],
      lastStop: "",
      delay: 0,
      trainPosition: { calcDiffMinutes: 0 },
      routeStations: [],
      visaWagonData: null,
    },
  ],
}

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
      trackEvent("route_card_header_enabled")
      setAnalyticsUserProperty("route_card_header_enabled", "true")
    } else {
      trackEvent("route_card_header_disabled")
      setAnalyticsUserProperty("route_card_header_enabled", "false")
    }
    setShowRouteCardHeader(value)
  }

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <Text style={SETTING_GROUP_TITLE} tx="settings.routeCard" />
      <Animated.View style={animatedCardStyle}>
        <RouteCard
          isActiveRide={false}
          isRouteInThePast={false}
          departureTime={routeItem.departureTime}
          arrivalTime={routeItem.arrivalTime}
          duration={routeItem.duration}
          isMuchShorter={false}
          isMuchLonger={false}
          stops={0}
          delay={0}
          routeItem={routeItem}
          style={{ marginBottom: spacing[4], backgroundColor: color.secondaryBackground }}
        />
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
