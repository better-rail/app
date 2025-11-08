import React from "react"
import { observer } from "mobx-react-lite"
import { Platform, View, type ViewStyle } from "react-native"
import { RouteCard, Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { SETTING_GROUP } from "./settings-styles"
import { useIsDarkMode } from "../../hooks"
import { useStores } from "../../models"
import { formatRouteDuration, routeDurationInMs } from "../../utils/helpers/date-helpers"
import { RouteItem } from "../../services/api"

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
      trainNumber: 1234,
      stopStations: [],
      lastStop: "",
      delay: 0,
      trainPosition: { calcDiffMinutes: 0 },
      routeStations: [],
      visaWagonData: null,
    },
  ],
}

export const UISettingsScreen = observer(function UISettingsScreen() {
  const isDarkMode = useIsDarkMode()
  const { settings } = useStores()

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.showRouteCardHeader")}
          toggle
          toggleValue={settings.showRouteCardHeader}
          onToggle={(value) => settings.setShowRouteCardHeader(value)}
        />
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
        />
      </View>
    </Screen>
  )
})
